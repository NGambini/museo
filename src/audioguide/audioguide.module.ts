import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Audioguide } from './audioguide.entity';
import { AudioguideService } from './audioguide.service';
import { AudioguideController } from './audioguide.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Audioguide]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [AudioguideController],
  providers: [AudioguideService, ThrottlerGuard],
})
export class AudioguideModule {}
