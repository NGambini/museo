import { ApiProperty } from '@nestjs/swagger';

// Vue allégée du catalogue : pas d'`attributes`, donc aucune URL signée à
// produire. Signer les médias de chaque chapitre pour une page entière ferait
// des dizaines d'appels GCS par requête ; le client appelle `GET /:id` sur
// l'audioguide qu'il veut réellement écouter.
export class AudioguideSummary {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0' })
  placeId: string;

  @ApiProperty({ example: 'Eiffel Tower' })
  placeName: string;

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
