/** Mirrors the API's generation job payload, pushed over the websocket. */
export type GenerationStep =
  | 'queued'
  | 'place_details'
  | 'main_photo'
  | 'writing'
  | 'images'
  | 'audio'
  | 'saving'
  | 'done'
  | 'failed';

export interface GenerationJob {
  id: string;
  placeId: string;
  lang: string;
  step: GenerationStep;
  progress: number;
  message: string;
  audioguideId?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
