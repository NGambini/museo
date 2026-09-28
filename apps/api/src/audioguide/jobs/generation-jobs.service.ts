import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { GenerationJob, GenerationStep } from './generation-job.types';

/**
 * In-memory registry of generation jobs.
 *
 * Deliberately not persisted: a job only matters while the browser that started
 * it is watching, and a restart loses nothing that a page reload cannot recover
 * — the audioguide either made it into the database or it did not.
 *
 * The consequence to keep in mind is that this is per-instance. On Cloud Run
 * with more than one instance, a client polling `GET /admin/jobs/:id` can land
 * on an instance that never saw the job. Session affinity keeps the websocket
 * on the right instance; the REST endpoint answering 404 is the tell.
 */
@Injectable()
export class GenerationJobsService {
  private readonly logger = new Logger(GenerationJobsService.name);
  private readonly jobs = new Map<string, GenerationJob>();
  private readonly emitter = new EventEmitter();

  /** Finished jobs are swept after this delay, to bound the map. */
  private static readonly RETENTION_MS = 30 * 60 * 1000;

  create(placeId: string, lang: string): GenerationJob {
    const job: GenerationJob = {
      id: randomUUID(),
      placeId,
      lang,
      step: 'queued',
      progress: 0,
      message: 'Queued',
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  find(id: string): GenerationJob {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Generation job not found');
    return job;
  }

  update(
    id: string,
    step: GenerationStep,
    progress: number,
    message: string,
  ): void {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, { step, progress, message });
    this.publish(job);
  }

  succeed(id: string, audioguideId: string): void {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, {
      step: 'done' satisfies GenerationStep,
      progress: 1,
      message: 'Audioguide ready',
      audioguideId,
      finishedAt: new Date().toISOString(),
    });
    this.publish(job);
    this.scheduleSweep(id);
  }

  fail(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, {
      step: 'failed' satisfies GenerationStep,
      message: 'Generation failed',
      error,
      finishedAt: new Date().toISOString(),
    });
    this.publish(job);
    this.scheduleSweep(id);
  }

  /** Subscribing returns the unsubscribe function, so callers cannot leak listeners. */
  subscribe(listener: (job: GenerationJob) => void): () => void {
    this.emitter.on('update', listener);
    return () => this.emitter.off('update', listener);
  }

  private publish(job: GenerationJob): void {
    this.logger.log(
      `Job ${job.id}: ${job.step} (${Math.round(job.progress * 100)}%)`,
    );
    this.emitter.emit('update', { ...job });
  }

  private scheduleSweep(id: string): void {
    const timer = setTimeout(
      () => this.jobs.delete(id),
      GenerationJobsService.RETENTION_MS,
    );
    // Do not hold the event loop open just to forget a job.
    timer.unref();
  }
}
