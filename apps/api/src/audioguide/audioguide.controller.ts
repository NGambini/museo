import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
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
import {
  DEFAULT_PAGE_SIZE,
  ListAudioguidesQueryDto,
} from './dto/list-audioguides.dto';
import { PaginatedAudioguides } from './dto/audioguide-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { Audioguide } from './audioguide.entity';
import type { GenerationJob } from './jobs/generation-job.types';
import { trackByUserOrIp } from '../common/guards/track-by-user.util';

// No class-level guard: reading the catalogue is open so the app works without
// an account. Only generation is gated, on the route itself.
@ApiTags('Audioguides')
@Controller('audioguides')
export class AudioguideController {
  constructor(private readonly audioguideService: AudioguideService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({
    default: { limit: 5, ttl: 3_600_000, getTracker: trackByUserOrIp },
  })
  @ApiOperation({
    summary:
      'Start generating an audioguide from a Google Places ID (admin only)',
    description:
      'Returns as soon as the work is accepted. Progress is pushed on the ' +
      '/generation websocket namespace; GET /admin/jobs/:id gives the same ' +
      'state over HTTP for clients that missed an event.',
  })
  @ApiResponse({
    status: 202,
    description:
      'Generation started, or already finished when the audioguide existed',
  })
  @ApiResponse({ status: 403, description: 'Requires the admin role' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({
    status: 503,
    description: 'Daily generation limit reached for the whole service',
  })
  generate(@Body() dto: GenerateAudioguideDto): Promise<GenerationJob> {
    return this.audioguideService.startGeneration(
      dto.place_id,
      dto.lang ?? 'fr',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List the shared audioguide catalogue (no authentication)',
  })
  @ApiResponse({ status: 200, type: PaginatedAudioguides })
  findAll(
    @Query() query: ListAudioguidesQueryDto,
  ): Promise<PaginatedAudioguides> {
    return this.audioguideService.findAll(
      query.page ?? 1,
      query.limit ?? DEFAULT_PAGE_SIZE,
      query.lang,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a single audioguide by id, media included (no authentication)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string): Promise<Audioguide> {
    return this.audioguideService.findOne(id);
  }
}
