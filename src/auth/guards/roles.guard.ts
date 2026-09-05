import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser {
  user?: { role?: UserRole };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    // The role is read from the entity JwtStrategy reloads on every request,
    // not from the token payload: a promotion or demotion in the database takes
    // effect on the next request instead of waiting for the token to expire.
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    return !!user?.role && requiredRoles.includes(user.role);
  }
}
