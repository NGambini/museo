import { NotFoundException } from '@nestjs/common';
import { GenerationJobsService } from './generation-jobs.service';
import { GenerationJob } from './generation-job.types';

describe('GenerationJobsService', () => {
  let service: GenerationJobsService;

  beforeEach(() => {
    service = new GenerationJobsService();
  });

  it('starts a job in the queued step', () => {
    const job = service.create('place-123', 'fr');

    expect(job.step).toBe('queued');
    expect(job.progress).toBe(0);
    expect(job.finishedAt).toBeUndefined();
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() => service.find('nope')).toThrow(NotFoundException);
  });

  it('publishes every transition to subscribers', () => {
    const seen: GenerationJob[] = [];
    service.subscribe((job) => seen.push(job));

    const job = service.create('place-123', 'fr');
    service.update(job.id, 'writing', 0.15, 'Writing');
    service.succeed(job.id, 'audioguide-1');

    expect(seen.map((j) => j.step)).toEqual(['writing', 'done']);
    expect(seen.at(-1)?.audioguideId).toBe('audioguide-1');
  });

  it('hands subscribers a copy, so a later transition cannot mutate it', () => {
    const seen: GenerationJob[] = [];
    service.subscribe((job) => seen.push(job));

    const job = service.create('place-123', 'fr');
    service.update(job.id, 'writing', 0.15, 'Writing');
    service.update(job.id, 'audio', 0.6, 'Recording');

    expect(seen[0].step).toBe('writing');
  });

  it('stops notifying once unsubscribed', () => {
    let calls = 0;
    const unsubscribe = service.subscribe(() => (calls += 1));

    const job = service.create('place-123', 'fr');
    service.update(job.id, 'writing', 0.15, 'Writing');
    unsubscribe();
    service.update(job.id, 'audio', 0.6, 'Recording');

    expect(calls).toBe(1);
  });

  it('records the failure reason so the client can show it', () => {
    const job = service.create('place-123', 'fr');
    service.fail(job.id, 'Gemini overloaded');

    const failed = service.find(job.id);
    expect(failed.step).toBe('failed');
    expect(failed.error).toBe('Gemini overloaded');
    expect(failed.finishedAt).toBeDefined();
  });

  it('ignores transitions on a job that no longer exists', () => {
    expect(() =>
      service.update('gone', 'writing', 0.1, 'Writing'),
    ).not.toThrow();
    expect(() => service.succeed('gone', 'x')).not.toThrow();
    expect(() => service.fail('gone', 'x')).not.toThrow();
  });
});
