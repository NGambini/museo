export interface GeminiChapter {
  chapter_number: number;
  title: string;
  description: string;
  /** Karaoke-line segmentation as produced by the LLM — grouped/split for natural read-along pacing. */
  lines: string[];
  text: string;
  image_search_query: string;
  image_url?: string;
  audio_url?: string;
  transcript?: string;
}

export interface GeminiResult {
  title: string;
  admission_price: string | null;
  history: string;
  chapters: GeminiChapter[];
}

export interface PlaceDetails {
  placeName: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  mainImagePath: string | undefined;
}
