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

  // Les comptes créés par signup sont toujours `user`. La promotion en `admin`
  // se fait à la main en base :
  //   UPDATE users SET role = 'admin' WHERE email = '...';
  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;
}
