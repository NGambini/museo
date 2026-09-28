import { Column, Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/base.entity';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // Accounts created through signup are always `user`. Promotion to `admin` is
  // done by hand in the database:
  //   UPDATE users SET role = 'admin' WHERE email = '...';
  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;
}
