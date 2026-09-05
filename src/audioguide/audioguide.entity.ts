import { Column, Entity, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/base.entity';

@Entity('audioguides')
@Index(['placeId', 'lang'], { unique: true })
export class Audioguide extends BaseEntity {
  @ApiProperty({ example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0' })
  @Index()
  @Column()
  placeId: string;

  @ApiProperty({ example: 'Eiffel Tower' })
  @Column()
  placeName: string;

  // Filled from the Google Places address components at generation time.
  // Nullable: some place ids resolve to no locality at all, and the older rows
  // predate this column.
  @ApiProperty({ example: 'Paris', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @ApiProperty({ example: 48.8584 })
  @Column({ type: 'float' })
  latitude: number;

  @ApiProperty({ example: 2.2945 })
  @Column({ type: 'float' })
  longitude: number;

  @ApiProperty({ example: 'fr' })
  @Column({ default: 'fr' })
  lang: string;

  @ApiProperty({ example: { title: 'Tour Eiffel', chapters: [] } })
  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;
}
