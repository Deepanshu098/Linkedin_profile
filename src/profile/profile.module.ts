import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { VoyagerProvider } from './providers/voyager.provider';

@Module({
  imports: [HttpModule],
  controllers: [ProfileController],
  providers: [ProfileService, VoyagerProvider],
  exports: [ProfileService],
})
export class ProfileModule {}