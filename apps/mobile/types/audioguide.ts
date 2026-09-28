export type AudioguideChapter = {
  chapter_number: number;
  title: string;
  text: string;
  lines: string[];
  description: string;
  image_url: string;
  audio_url: string;
  transcript: string;
};

export type AudioguideAttributes = {
  title: string;
  rating: number;
  history: string;
  main_image_url: string;
  admission_price: number | null;
  chapters: AudioguideChapter[];
};

/** Ce que renvoie GET /audioguides (catalogue partagé, sans les attributs). */
export type AudioguideSummary = {
  id: string;
  placeId: string;
  placeName: string;
  city: string | null;
  latitude: number;
  longitude: number;
  lang: string;
  createdAt: string;
};

/** Ce que renvoie GET /audioguides/:id (média inclus). */
export type Audioguide = {
  id: string;
  createdAt: string;
  updatedAt: string;
  placeId: string;
  placeName: string;
  city: string | null;
  latitude: number;
  longitude: number;
  lang: string;
  attributes: AudioguideAttributes;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type PaginatedAudioguides = Paginated<AudioguideSummary>;
