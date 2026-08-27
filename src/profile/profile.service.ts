import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { VoyagerProvider } from './providers/voyager.provider';
import { NormalizedProfile } from './interfaces/normalized-profile.interface';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  private readonly cache = new Map<
    string,
    {
      data: NormalizedProfile;
      cachedAt: number;
    }
  >();

  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(
    private readonly voyagerProvider: VoyagerProvider,
  ) {}

  async getProfile(
    url: string,
  ): Promise<{
    data: NormalizedProfile;
    meta: {
      source: string;
      fetchedAt: string;
    };
  }> {
    const username = this.extractUsername(url);

    if (!username) {
      throw new HttpException(
        'Failed to parse LinkedIn username from URL',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cacheKey = username.toLowerCase();

    const cachedItem = this.cache.get(cacheKey);

    if (
      cachedItem &&
      Date.now() - cachedItem.cachedAt < this.CACHE_TTL_MS
    ) {
      this.logger.log(`Serving "${username}" from cache`);

      return {
        data: cachedItem.data,
        meta: {
          source: 'linkedin_cached',
          fetchedAt: new Date(cachedItem.cachedAt).toISOString(),
        },
      };
    }

    const data = await this.voyagerProvider.fetchProfile(username);

    const cachedAt = Date.now();

    this.cache.set(cacheKey, {
      data,
      cachedAt,
    });

    return {
      data,
      meta: {
        source: 'linkedin',
        fetchedAt: new Date(cachedAt).toISOString(),
      },
    };
  }

  private extractUsername(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.hostname !== 'linkedin.com' &&
        parsedUrl.hostname !== 'www.linkedin.com'
      ) {
        return null;
      }

      const match = parsedUrl.pathname.match(
        /^\/in\/([a-zA-Z0-9_-]+)\/?$/,
      );

      return match?.[1] || null;
    } catch {
      return null;
    }
  }
}