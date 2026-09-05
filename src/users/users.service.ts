import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import {
  AdminListUsersQueryDto,
  AdminPaginatedUsers,
  AdminUser,
} from './dto/admin-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(email: string, hashedPassword: string): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  // ── Admin surface ───────────────────────────────────────────────────────────
  // Reached through /admin/users. Rows are mapped to AdminUser before leaving
  // the service: the entity carries `password` and `refreshToken`, which must
  // never reach a client.

  async findAllForAdmin(
    query: AdminListUsersQueryDto,
  ): Promise<AdminPaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.email) where.email = ILike(`%${query.email}%`);

    const [items, total] = await this.usersRepository.findAndCount({
      where,
      order: { [query.sort_by ?? 'createdAt']: query.direction ?? 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((user) => AdminUser.from(user)),
      total,
      page,
      limit,
    };
  }

  async findOneForAdmin(id: string): Promise<AdminUser> {
    return AdminUser.from(await this.findById(id));
  }

  async updateRole(id: string, role: UserRole): Promise<AdminUser> {
    const user = await this.findById(id);
    user.role = role;
    return AdminUser.from(await this.usersRepository.save(user));
  }

  async updateRefreshToken(
    userId: string,
    hashedToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: hashedToken });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { password: hashedPassword });
  }
}
