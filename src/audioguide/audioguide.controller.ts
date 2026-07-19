import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
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
import { Request as ExpressRequest } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AudioguideService } from './audioguide.service';
import { GenerateAudioguideDto } from './dto/generate-audioguide.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Audioguide } from './audioguide.entity';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { trackByUserOrIp } from '../common/guards/track-by-user.util';

interface AuthRequest extends ExpressRequest {
  user: { id: string };
}

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
  generate(
    @Body() dto: GenerateAudioguideDto,
    @Request() req: AuthRequest,
  ): Promise<Audioguide> {
    return this.audioguideService.generate(
      dto.place_id,
      dto.lang ?? 'fr',
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all audioguides for the authenticated user' })
  @ApiResponse({ status: 200, type: [Audioguide] })
  findAll(@Request() req: AuthRequest): Promise<Audioguide[]> {
    return this.audioguideService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audioguide by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ): Promise<Audioguide> {
    return this.audioguideService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an audioguide' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deleted successfully' })
  remove(@Param('id') id: string, @Request() req: AuthRequest): Promise<void> {
    return this.audioguideService.remove(id, req.user.id);
  }
}
