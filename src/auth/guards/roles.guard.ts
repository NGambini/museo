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

    // On lit le rôle sur l'entité rechargée par JwtStrategy, pas sur le payload
    // du token : une promotion ou une rétrogradation en base prend effet à la
    // requête suivante, sans attendre l'expiration de l'access token.
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    return !!user?.role && requiredRoles.includes(user.role);
  }
}
