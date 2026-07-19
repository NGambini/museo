import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Throttle,
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { trackByUserOrIp } from './track-by-user.util';

// Verifies the exact wiring used on AudioguideController#generate: the
// stock ThrottlerGuard combined with `getTracker: trackByUserOrIp` in
// `@Throttle`, with no custom guard subclass.
class TestController {
  @Throttle({
    default: { limit: 5, ttl: 3_600_000, getTracker: trackByUserOrIp },
  })
  generate(this: void) {}
}

const makeContext = (
  user: { id: string } | undefined,
  ip = '1.2.3.4',
): ExecutionContext => {
  const req = { user, ip, headers: {} };
  const res = { header: jest.fn() };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => TestController.prototype.generate,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
};

describe('ThrottlerGuard + trackByUserOrIp (per-route @Throttle config)', () => {
  let guard: ThrottlerGuard;
  let storageService: ThrottlerStorageService;

  beforeEach(async () => {
    storageService = new ThrottlerStorageService();
    guard = new ThrottlerGuard(
      [{ ttl: 60_000, limit: 100 }],
      storageService,
      new Reflector(),
    );
    await guard.onModuleInit();
  });

  afterEach(() => {
    storageService.onApplicationShutdown();
  });

  it('allows up to 5 requests for a single user', async () => {
    const context = makeContext({ id: 'user-1' });
    for (let i = 0; i < 5; i++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('blocks the 6th request within the window for the same user', async () => {
    const context = makeContext({ id: 'user-1' });
    for (let i = 0; i < 5; i++) {
      await guard.canActivate(context);
    }
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ThrottlerException,
    );
  });

  it('tracks each user independently', async () => {
    const userOne = makeContext({ id: 'user-1' });
    const userTwo = makeContext({ id: 'user-2' });

    for (let i = 0; i < 5; i++) {
      await guard.canActivate(userOne);
    }

    await expect(guard.canActivate(userTwo)).resolves.toBe(true);
  });
});
