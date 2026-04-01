export interface GeminiChapter {
  chapter_number: number;
  title: string;
  description: string;
  text: string;
  image_search_query: string;
  image_url?: string;
  audio_url?: string;
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
  mainImageUrl: string | undefined;
}
