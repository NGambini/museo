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

export type Audioguide = {
  id: string;
  createdAt: string;
  updatedAt: string;
  placeId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  lang: string;
  userId: string;
  attributes: AudioguideAttributes;
};

