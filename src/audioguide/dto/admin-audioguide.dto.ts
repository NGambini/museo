import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Audioguide } from '../audioguide.entity';

export const ADMIN_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_MAX_PAGE_SIZE = 200;

/** Columns the backoffice is allowed to sort on. Anything else is rejected. */
export const SORTABLE_FIELDS = [
  'placeName',
  'placeId',
  'lang',
  'createdAt',
  'updatedAt',
] as const;

export class AdminListAudioguidesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: ADMIN_MAX_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_MAX_PAGE_SIZE)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Exact match, used to detect duplicates',
  })
  @IsString()
  @IsOptional()
  place_id?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match' })
  @IsString()
  @IsOptional()
  place_name?: string;

  @ApiPropertyOptional({ example: 'fr' })
  @IsString()
  @IsOptional()
  lang?: string;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'createdAt' })
  @IsIn(SORTABLE_FIELDS as unknown as string[])
  @IsOptional()
  sort_by?: (typeof SORTABLE_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  direction?: 'asc' | 'desc';
}

export class UpdateAudioguideDto {
  @ApiPropertyOptional({ example: 'Eiffel Tower' })
  @IsString()
  @IsOptional()
  placeName?: string;

  @ApiPropertyOptional({ example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0' })
  @IsString()
  @IsOptional()
  placeId?: string;

  @ApiPropertyOptional({ example: 'fr' })
  @IsString()
  @IsOptional()
  lang?: string;

  @ApiPropertyOptional({ example: 48.8584 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 2.2945 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  /**
   * Whole jsonb blob, replaced as-is. The `*_url` fields must hold GCS paths,
   * never signed URLs: signatures expire, and storing one would break playback
   * an hour later.
   */
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, unknown>;
}

export class AdminPaginatedAudioguides {
  @ApiProperty({ type: [Audioguide] })
  items: Audioguide[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class AudioguideStats {
  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3, description: 'Created since midnight UTC' })
  generatedToday: number;

  @ApiProperty({ example: 100, description: 'Service-wide daily cap' })
  dailyCap: number;

  @ApiProperty({ example: [{ lang: 'fr', count: 40 }] })
  byLang: Array<{ lang: string; count: number }>;
}
