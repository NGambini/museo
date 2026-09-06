import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Audioguide } from './audioguide.entity';
import { AudioguideService } from './audioguide.service';
import { AudioguideController } from './audioguide.controller';
import { AdminAudioguideController } from './admin-audioguide.controller';
import { GenerationJobsService } from './jobs/generation-jobs.service';
import { GenerationGateway } from './jobs/generation.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Audioguide]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // The gateway verifies the access token presented in the handshake.
    JwtModule.register({}),
  ],
  controllers: [AudioguideController, AdminAudioguideController],
  providers: [
    AudioguideService,
    GenerationJobsService,
    GenerationGateway,
    ThrottlerGuard,
  ],
})
export class AudioguideModule {}
