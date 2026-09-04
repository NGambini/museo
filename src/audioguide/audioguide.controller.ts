import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AudioguideService } from './audioguide.service';
import { GenerateAudioguideDto } from './dto/generate-audioguide.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Audioguide } from './audioguide.entity';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { trackByUserOrIp } from '../common/guards/track-by-user.util';

@ApiTags('Audioguides')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('audioguides')
export class AudioguideController {
  constructor(private readonly audioguideService: AudioguideService) {}

  @Post('generate')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: 5, ttl: 3_600_000, getTracker: trackByUserOrIp },
  })
  @UseInterceptors(new TimeoutInterceptor(60_000))
  @ApiOperation({ summary: 'Generate an audioguide from a Google Places ID' })
  @ApiResponse({ status: 201, type: Audioguide })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  @ApiResponse({
    status: 503,
    description: 'Daily generation limit reached for the whole service',
  })
  generate(@Body() dto: GenerateAudioguideDto): Promise<Audioguide> {
    return this.audioguideService.generate(dto.place_id, dto.lang ?? 'fr');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audioguide by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string): Promise<Audioguide> {
    return this.audioguideService.findOne(id);
  }
}
