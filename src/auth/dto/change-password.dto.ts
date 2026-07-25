import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'newStrongPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
