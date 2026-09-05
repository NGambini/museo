// Shape of the `attributes` jsonb as produced by the API
// (`buildAudioguideAttributes`). The `*_url` fields stored in the database are
// relative GCS paths; the API swaps them for signed URLs on read.

export interface AudioguideChapter {
  chapter_number: number;
  title: string;
  description: string;
  /** Karaoke segmentation produced by the LLM, for synchronised read-along. */
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
  rating?: number | null;
  main_image_url?: string | null;
  chapters?: AudioguideChapter[];
  [key: string]: unknown;
}

export const EMPTY_ATTRIBUTES: AudioguideAttributes = {
  title: '',
  history: '',
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
