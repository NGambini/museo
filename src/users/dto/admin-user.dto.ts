import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { User } from '../user.entity';
import { UserRole } from '../user-role.enum';

export const USERS_MAX_PAGE_SIZE = 200;

/** Columns the backoffice is allowed to sort on. Anything else is rejected. */
export const USER_SORTABLE_FIELDS = ['email', 'role', 'createdAt'] as const;

export class AdminListUsersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: USERS_MAX_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USERS_MAX_PAGE_SIZE)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: USER_SORTABLE_FIELDS, default: 'createdAt' })
  @IsIn(USER_SORTABLE_FIELDS as unknown as string[])
  @IsOptional()
  sort_by?: (typeof USER_SORTABLE_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  direction?: 'asc' | 'desc';
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

/**
 * What the admin surface exposes of a user. Deliberately not the entity: it
 * carries `password` and `refreshToken`, which must never leave the API.
 */
export class AdminUser {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(user: User): AdminUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class AdminPaginatedUsers {
  @ApiProperty({ type: [AdminUser] })
  items: AdminUser[];

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
