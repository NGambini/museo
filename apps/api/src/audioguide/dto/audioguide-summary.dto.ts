import { ApiProperty } from '@nestjs/swagger';

// Lightweight catalogue view: no `attributes`, so no signed URL to produce.
// Signing every chapter's media for a whole page would mean dozens of GCS calls
// per request; clients call `GET /:id` for the audioguide they actually play.
export class AudioguideSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0' })
  placeId: string;

  @ApiProperty({ example: 'Eiffel Tower' })
  placeName: string;

  @ApiProperty({ example: 'Paris', nullable: true })
  city: string | null;

  @ApiProperty({ example: 48.8584 })
  latitude: number;

  @ApiProperty({ example: 2.2945 })
  longitude: number;

  @ApiProperty({ example: 'fr' })
  lang: string;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAudioguides {
  @ApiProperty({ type: [AudioguideSummary] })
  items: AudioguideSummary[];

  @ApiProperty({
    example: 42,
    description: 'Total audioguides in the catalogue',
  })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
