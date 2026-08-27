import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { VoyagerProvider } from './providers/voyager.provider';
import { NormalizedProfile } from './interfaces/normalized-profile.interface';

describe('ProfileService', () => {
  let service: ProfileService;
  let voyagerProvider: {
    fetchProfile: jest.Mock;
  };

  const mockProfile: NormalizedProfile = {
    profileUrl: 'https://www.linkedin.com/in/john-doe',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    headline: 'Software Engineer',
    location: {
      city: 'Delhi',
      country: 'India',
      raw: 'Delhi, India',
    },
    about: 'Software Engineer profile',
    experience: [],
    education: [],
    skills: ['TypeScript', 'Node.js'],
    certifications: [],
    languages: [],
  };

  beforeEach(async () => {
    voyagerProvider = {
      fetchProfile: jest.fn().mockResolvedValue(mockProfile),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          ProfileService,
          {
            provide: VoyagerProvider,
            useValue: voyagerProvider,
          },
        ],
      }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should fetch profile from VoyagerProvider', async () => {
      const result = await service.getProfile(
        'https://www.linkedin.com/in/john-doe',
      );

      expect(voyagerProvider.fetchProfile).toHaveBeenCalledWith(
        'john-doe',
      );

      expect(result.data.name).toBe('John Doe');
      expect(result.meta.source).toBe('linkedin');
    });

    it('should serve profile from cache on subsequent requests', async () => {
      // First request
      await service.getProfile(
        'https://www.linkedin.com/in/john-doe',
      );

      // Second request
      const result = await service.getProfile(
        'https://www.linkedin.com/in/john-doe',
      );

      // Provider should only be called once
      expect(
        voyagerProvider.fetchProfile,
      ).toHaveBeenCalledTimes(1);

      expect(result.data.name).toBe('John Doe');
      expect(result.meta.source).toBe('linkedin_cached');
    });

    it('should reject an invalid LinkedIn URL', async () => {
      await expect(
        service.getProfile('https://google.com/test'),
      ).rejects.toThrow(
        'Failed to parse LinkedIn username from URL',
      );

      expect(
        voyagerProvider.fetchProfile,
      ).not.toHaveBeenCalled();
    });
  });
});