import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AudioguideService } from './audioguide.service';
import { CreateAudioguideDto } from './dto/create-audioguide.dto';
import { UpdateAudioguideDto } from './dto/update-audioguide.dto';
import { GenerateAudioguideDto } from './dto/generate-audioguide.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Audioguide } from './audioguide.entity';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';

@ApiTags('Audioguides')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('audioguides')
export class AudioguideController {
  constructor(private readonly audioguideService: AudioguideService) {}

  @Post('generate')
  @UseInterceptors(new TimeoutInterceptor(60_000))
  @ApiOperation({ summary: 'Generate an audioguide from a Google Places ID' })
  @ApiResponse({ status: 201, type: Audioguide })
  @ApiResponse({ status: 500, description: 'Generation failed' })
  generate(
    @Body() dto: GenerateAudioguideDto,
    @Request() req: any,
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
  findAll(@Request() req: any): Promise<Audioguide[]> {
    return this.audioguideService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audioguide by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string, @Request() req: any): Promise<Audioguide> {
    return this.audioguideService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new audioguide' })
  @ApiResponse({ status: 201, type: Audioguide })
  create(
    @Body() dto: CreateAudioguideDto,
    @Request() req: any,
  ): Promise<Audioguide> {
    return this.audioguideService.create(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an audioguide' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: Audioguide })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioguideDto,
    @Request() req: any,
  ): Promise<Audioguide> {
    return this.audioguideService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an audioguide' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Deleted successfully' })
  remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.audioguideService.remove(id, req.user.id);
  }
}
