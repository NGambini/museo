import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  AdminListUsersQueryDto,
  AdminPaginatedUsers,
  AdminUser,
  UpdateUserRoleDto,
} from './dto/admin-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user-role.enum';

/**
 * Account administration for the backoffice. Read-only apart from the role:
 * creating an account goes through POST /auth/signup, which hashes the
 * password, and nothing here ever writes to that column.
 */
@ApiTags('Admin — Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List accounts' })
  @ApiResponse({ status: 200, type: AdminPaginatedUsers })
  @ApiResponse({ status: 403, description: 'Requires the admin role' })
  findAll(
    @Query() query: AdminListUsersQueryDto,
  ): Promise<AdminPaginatedUsers> {
    return this.usersService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: AdminUser })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string): Promise<AdminUser> {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change an account role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: AdminUser })
  @ApiResponse({ status: 404, description: 'Not found' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<AdminUser> {
    return this.usersService.updateRole(id, dto.role);
  }
}
