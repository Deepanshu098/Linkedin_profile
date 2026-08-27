import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProfileService } from './profile.service';
import { FetchProfileDto } from './dto/fetch-profile.dto';

@ApiTags('LinkedIn Profile')
@Controller('api/v1/profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch a LinkedIn profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile fetched successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid LinkedIn profile URL',
  })
  @ApiResponse({
    status: 401,
    description: 'LinkedIn authentication failed',
  })
  @ApiResponse({
    status: 404,
    description: 'LinkedIn profile not found',
  })
  @ApiResponse({
    status: 502,
    description: 'LinkedIn request failed',
  })
  async fetchProfile(
    @Body() dto: FetchProfileDto,
  ) {
    return this.profileService.getProfile(dto.url);
  }
}