export const GENERATION_STEPS = [
  'queued',
  'place_details',
  'main_photo',
  'writing',
  'images',
  'audio',
  'saving',
  'done',
  'failed',
] as const;

export type GenerationStep = (typeof GENERATION_STEPS)[number];

export interface GenerationJob {
  id: string;
  placeId: string;
  lang: string;
  step: GenerationStep;
  /** 0 to 1. Coarse on purpose — the steps have very different durations. */
  progress: number;
  /** Short human-readable label, shown as-is by the backoffice. */
  message: string;
  /** Set once the job reaches `done`. */
  audioguideId?: string;
  /** Set once the job reaches `failed`. */
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export const JOB_EVENT = 'generation:update';
