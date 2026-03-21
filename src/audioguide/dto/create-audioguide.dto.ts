import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateAudioguideDto {
  @ApiProperty({ example: 'Eiffel Tower' })
  @IsString()
  placeName: string;

  @ApiProperty({ example: 48.8584 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 2.2945 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    example: { audio_url: 'https://...', language: 'fr' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
