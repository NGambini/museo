import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user-role.enum';

export const ROLES_KEY = 'roles';

// A route without this decorator stays open to any authenticated account:
// RolesGuard only restricts what it is explicitly pointed at.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
