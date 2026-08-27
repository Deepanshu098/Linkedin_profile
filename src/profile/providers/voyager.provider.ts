import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ProfileProvider } from '../interfaces/profile-provider.interface';
import { NormalizedProfile, ExperienceEntry, EducationEntry, CertificationEntry, LanguageEntry } from '../interfaces/normalized-profile.interface';

@Injectable()
export class VoyagerProvider implements ProfileProvider {
  private readonly logger = new Logger(VoyagerProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async fetchProfile(username: string): Promise<NormalizedProfile> {
  const liAt = this.configService.get<string>('LINKEDIN_LI_AT');
  const jsessionId = this.configService.get<string>('LINKEDIN_JSESSIONID');

  if (!liAt || !jsessionId) {
    throw new HttpException(
      'LinkedIn credentials are not configured.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const csrfToken = jsessionId.replace(/^"|"$/g, '');

  const url = 'https://www.linkedin.com/voyager/api/identity/dash/profiles';
  const params = {
    q: 'memberIdentity',
    memberIdentity: username,
    decorationId: 'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93',
  };

  const headers = {
    Cookie: `li_at=${liAt}; JSESSIONID="${csrfToken}"`,
    'csrf-token': csrfToken,
    'x-restli-protocol-version': '2.0.0',
    'x-li-lang': 'en_US',
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
  };

  try {
    this.logger.log(`Fetching LinkedIn profile: ${username}`);

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers,
        params,
        maxRedirects: 0,
        validateStatus: () => true,
      }),
    );

    this.logger.log(`LinkedIn status: ${response.status}`);
    this.logger.log(
      `LinkedIn location: ${response.headers.location || 'none'}`,
    );

    if (response.status === 200) {
      return this.normalizeVoyagerData(username, response.data);
    }

    if (response.status === 401 || response.status === 403) {
      throw new HttpException(
        'LinkedIn authentication failed. Check LINKEDIN_LI_AT and LINKEDIN_JSESSIONID.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (response.status === 404) {
      throw new HttpException(
        `LinkedIn profile "${username}" was not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      throw new HttpException(
        'LinkedIn rejected the direct API request with a redirect. The LinkedIn session/API request is not being accepted.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    throw new HttpException(
      `LinkedIn returned HTTP ${response.status}.`,
      HttpStatus.BAD_GATEWAY,
    );
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(
      `LinkedIn request failed: ${error instanceof Error ? error.message : error}`,
    );

    throw new HttpException(
      'Failed to communicate with LinkedIn.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

  private normalizeVoyagerData(username: string, data: any): NormalizedProfile {
    const rootProfile = data?.elements?.[0] || {};
    
    // Helper to resolve multi-locale strings returning first available locale text
    const getLocaleText = (multiLocaleObj: any): string => {
      if (!multiLocaleObj) return '';
      const locales = Object.keys(multiLocaleObj);
      if (locales.length === 0) return '';
      return multiLocaleObj[locales[0]] || '';
    };

    const firstName = getLocaleText(rootProfile.multiLocaleFirstName) || rootProfile.firstName || '';
    const lastName = getLocaleText(rootProfile.multiLocaleLastName) || rootProfile.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || username;
    const headline = getLocaleText(rootProfile.multiLocaleHeadline) || rootProfile.headline || '';
    const about = getLocaleText(rootProfile.multiLocaleSummary) || rootProfile.summary || '';

    // Handle Profile Images (extracting from LinkedIn VectorImage format)
    const profileImage = this.extractVectorImage(rootProfile.profilePicture?.displayImageReference?.vectorImage);
    const backgroundImage = this.extractVectorImage(rootProfile.backgroundImage?.displayImageReference?.vectorImage);

    // Parse location
    const locationName = rootProfile.locationName || getLocaleText(rootProfile.multiLocaleLocationName);
    const location = {
      city: locationName || undefined,
      raw: locationName || undefined,
    };

    // Parse experiences
    const experienceElements = rootProfile.profilePositions?.elements || rootProfile.profilePositions || [];
    const experience: ExperienceEntry[] = experienceElements.map((pos: any) => {
      const expEntry: ExperienceEntry = {
        company: pos.companyName || getLocaleText(pos.multiLocaleCompanyName) || 'Unknown Company',
        title: pos.title || getLocaleText(pos.multiLocaleTitle) || 'Unknown Title',
        location: pos.locationName || getLocaleText(pos.multiLocaleLocationName) || undefined,
        description: pos.description || getLocaleText(pos.multiLocaleDescription) || undefined,
        period: this.parsePeriod(pos.timePeriod),
      };

      const logoImg = pos.company?.miniCompany?.logo?.['com.linkedin.common.VectorImage'] || pos.company?.logo?.vectorImage;
      if (logoImg) {
        expEntry.logoUrl = this.extractVectorImage(logoImg);
      }

      return expEntry;
    });

    // Parse education
    const educationElements = rootProfile.profileEducations?.elements || rootProfile.profileEducations || [];
    const education: EducationEntry[] = educationElements.map((edu: any) => ({
      school: edu.schoolName || getLocaleText(edu.multiLocaleSchoolName) || 'Unknown School',
      degree: edu.degreeName || getLocaleText(edu.multiLocaleDegreeName) || undefined,
      fieldOfStudy: edu.fieldOfStudy || getLocaleText(edu.multiLocaleFieldOfStudy) || undefined,
      description: edu.description || getLocaleText(edu.multiLocaleDescription) || undefined,
      period: this.parsePeriod(edu.timePeriod),
    }));

    // Parse skills
    const skillElements = rootProfile.profileSkills?.elements || rootProfile.profileSkills || [];
    const skills: string[] = skillElements
      .map((skill: any) => skill.name || getLocaleText(skill.multiLocaleName))
      .filter(Boolean);

    // Parse certifications
    const certElements = rootProfile.profileCertifications?.elements || rootProfile.profileCertifications || [];
    const certifications: CertificationEntry[] = certElements.map((cert: any) => ({
      name: cert.name || getLocaleText(cert.multiLocaleName) || 'Unknown Certification',
      authority: cert.authority || getLocaleText(cert.multiLocaleAuthority) || undefined,
      licenseNumber: cert.licenseNumber || undefined,
      url: cert.url || undefined,
      period: this.parsePeriod(cert.timePeriod),
    }));

    // Parse languages
    const langElements = rootProfile.profileLanguages?.elements || rootProfile.profileLanguages || [];
    const languages: LanguageEntry[] = langElements.map((lang: any) => ({
      name: lang.name || getLocaleText(lang.multiLocaleName) || 'Unknown Language',
      proficiency: lang.proficiency || undefined,
    }));

    return {
      profileUrl: `https://www.linkedin.com/in/${username}`,
      name,
      firstName,
      lastName,
      headline,
      location,
      about,
      profileImage,
      backgroundImage,
      experience,
      education,
      skills,
      certifications,
      languages,
    };
  }

  private extractVectorImage(vectorImage: any): string | undefined {
    if (
      !vectorImage?.rootUrl ||
      !Array.isArray(vectorImage.artifacts) ||
      vectorImage.artifacts.length === 0
    ) {
      return undefined;
    }

    const largestArtifact = vectorImage.artifacts.reduce(
      (prev: any, current: any) => {
        const prevArea =
          (prev.width || 0) * (prev.height || 0);

        const currentArea =
          (current.width || 0) * (current.height || 0);

        return currentArea > prevArea ? current : prev;
      },
    );

    const path =
      largestArtifact.fileIdentifyingUrlPathSegment ??
      largestArtifact.fileIdentifyingParam;

    if (!path) {
      return undefined;
    }

    return `${vectorImage.rootUrl}${path}`;
  }

  private parsePeriod(timePeriod: any): any {
    if (!timePeriod) return undefined;

    const parseDate = (d: any) => {
      if (!d) return undefined;
      if (d.year && d.month) {
        const monthStr = String(d.month).padStart(2, '0');
        return `${d.year}-${monthStr}`;
      }
      if (d.year) {
        return String(d.year);
      }
      return undefined;
    };

    return {
      startDate: parseDate(timePeriod.startDate),
      endDate: parseDate(timePeriod.endDate),
    };
  }
}
