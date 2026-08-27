import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl, Matches } from 'class-validator';

export class FetchProfileDto {
  @ApiProperty({
    description: 'Public LinkedIn profile URL',
    example: 'https://www.linkedin.com/in/williamhgates',
  })
  @IsNotEmpty()
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
    },
    {
      message: 'URL must use HTTPS',
    },
  )
  @Matches(
    /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
    {
      message: 'URL must be a valid LinkedIn profile URL',
    },
  )
  url: string;
}