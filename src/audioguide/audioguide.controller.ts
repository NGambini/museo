import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { trackByUserOrIp } from '../common/guards/track-by-user.util';

@ApiTags('Audioguides')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audioguides')
export class AudioguideController {
  constructor(private readonly audioguideService: AudioguideService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: 5, ttl: 3_600_000, getTracker: trackByUserOrIp },
  })
  @UseInterceptors(new TimeoutInterceptor(60_000))
  @ApiOperation({
    summary: 'Generate an audioguide from a Google Places ID (admin only)',
  })
  @ApiResponse({ status: 201, type: Audioguide })
  @ApiResponse({ status: 403, description: 'Requires the admin role' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  @ApiResponse({
    status: 503,
    description: 'Daily generation limit reached for the whole service',
  })
  generate(@Body() dto: GenerateAudioguideDto): Promise<Audioguide> {
    return this.audioguideService.generate(dto.place_id, dto.lang ?? 'fr');
  }

  @Get()
  @ApiOperation({ summary: 'List the shared audioguide catalogue' })
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
  @ApiOperation({ summary: 'Get a single audioguide by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string): Promise<Audioguide> {
    return this.audioguideService.findOne(id);
  }
}
