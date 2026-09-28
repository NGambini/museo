import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/user-role.enum';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function requireRoles(roles: UserRole[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  }

  it('lets any authenticated user through when the route declares no role', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextWithUser({ role: UserRole.USER }))).toBe(
      true,
    );
  });

  it('lets any authenticated user through when the role list is empty', () => {
    requireRoles([]);
    expect(guard.canActivate(contextWithUser({ role: UserRole.USER }))).toBe(
      true,
    );
  });

  it('allows a user whose role is required', () => {
    requireRoles([UserRole.ADMIN]);
    expect(guard.canActivate(contextWithUser({ role: UserRole.ADMIN }))).toBe(
      true,
    );
  });

  it('rejects a user whose role is not required', () => {
    requireRoles([UserRole.ADMIN]);
    expect(guard.canActivate(contextWithUser({ role: UserRole.USER }))).toBe(
      false,
    );
  });

  it('rejects a request without a role on the user', () => {
    requireRoles([UserRole.ADMIN]);
    expect(guard.canActivate(contextWithUser({}))).toBe(false);
  });

  it('rejects a request without a user at all', () => {
    requireRoles([UserRole.ADMIN]);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
