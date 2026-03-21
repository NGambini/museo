import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateAudioguideDto {
  @ApiProperty({ example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0' })
  @IsString()
  place_id: string;

  @ApiPropertyOptional({ example: 'fr', default: 'fr' })
  @IsString()
  @IsOptional()
  lang?: string;
}
