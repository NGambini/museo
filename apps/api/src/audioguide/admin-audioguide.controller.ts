import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AudioguideService } from './audioguide.service';
import { Audioguide } from './audioguide.entity';
import {
  AdminListAudioguidesQueryDto,
  AdminPaginatedAudioguides,
  AudioguideStats,
  UpdateAudioguideDto,
} from './dto/admin-audioguide.dto';
import { GenerationJobsService } from './jobs/generation-jobs.service';
import type { GenerationJob } from './jobs/generation-job.types';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';

/**
 * Write surface used by the backoffice. Kept apart from the public controller
 * for two reasons: every route here is admin-only, and they return rows exactly
 * as stored — `attributes` holds raw GCS paths, not the signed URLs that
 * `GET /audioguides/:id` produces for playback.
 */
@ApiTags('Admin — Audioguides')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audioguides')
export class AdminAudioguideController {
  constructor(
    private readonly audioguideService: AudioguideService,
    private readonly jobs: GenerationJobsService,
  ) {}

  // Declared before ':id' on purpose: Nest matches routes in order, and a
  // ':id' route registered first would swallow '/stats' as an identifier.
  @Get('stats')
  @ApiOperation({ summary: 'Catalogue counters for the backoffice dashboard' })
  @ApiResponse({ status: 200, type: AudioguideStats })
  stats(): Promise<AudioguideStats> {
    return this.audioguideService.stats();
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'State of a generation job',
    description:
      'Same payload the websocket pushes. Lets a client that reconnected, or ' +
      'that never opened a socket, recover where a generation stands.',
  })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Unknown job' })
  job(@Param('jobId') jobId: string): GenerationJob {
    return this.jobs.find(jobId);
  }

  @Get()
  @ApiOperation({ summary: 'List audioguides with raw attributes' })
  @ApiResponse({ status: 200, type: AdminPaginatedAudioguides })
  @ApiResponse({ status: 403, description: 'Requires the admin role' })
  findAll(
    @Query() query: AdminListAudioguidesQueryDto,
  ): Promise<AdminPaginatedAudioguides> {
    return this.audioguideService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one audioguide with raw attributes' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string): Promise<Audioguide> {
    return this.audioguideService.findOneRaw(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an audioguide, including its jsonb content',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioguideDto,
  ): Promise<Audioguide> {
    return this.audioguideService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an audioguide from the shared catalogue' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.audioguideService.remove(id);
  }
}
