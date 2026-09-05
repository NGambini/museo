// Forme du jsonb `attributes` telle que produite par l'API
// (`buildAudioguideAttributes`). Les `*_url` stockés en base sont des chemins
// GCS relatifs ; l'API les remplace par des URLs signées à la lecture.

export interface AudioguideChapter {
  chapter_number: number;
  title: string;
  description: string;
  /** Découpage karaoké produit par le LLM, pour la lecture synchronisée. */
  lines?: string[];
  text?: string;
  image_search_query?: string;
  image_url?: string;
  audio_url?: string;
  transcript?: string;
}

export interface AudioguideAttributes {
  title?: string;
  history?: string;
  admission_price?: string | null;
  rating?: number | null;
  main_image_url?: string | null;
  chapters?: AudioguideChapter[];
  [key: string]: unknown;
}

export const EMPTY_ATTRIBUTES: AudioguideAttributes = {
  title: '',
  history: '',
  admission_price: null,
  rating: null,
  main_image_url: null,
  chapters: [],
};

export function emptyChapter(chapterNumber: number): AudioguideChapter {
  return {
    chapter_number: chapterNumber,
    title: '',
    description: '',
    lines: [],
    text: '',
    image_search_query: '',
  };
}
