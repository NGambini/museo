import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user-role.enum';

export const ROLES_KEY = 'roles';

// Une route sans ce décorateur reste ouverte à tout compte authentifié :
// RolesGuard ne restreint que ce qu'on lui désigne explicitement.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
