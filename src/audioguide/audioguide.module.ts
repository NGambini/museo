import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audioguide } from './audioguide.entity';
import { AudioguideService } from './audioguide.service';
import { AudioguideController } from './audioguide.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Audioguide])],
  controllers: [AudioguideController],
  providers: [AudioguideService],
})
export class AudioguideModule {}
