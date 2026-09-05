import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
// Commented out alongside the signup route below, so re-enabling one
// re-enables the other.
// import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt.guard';

interface AuthRequest extends ExpressRequest {
  user: { id: string };
}

interface RefreshRequest extends ExpressRequest {
  user: { id: string; refreshToken: string };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Self-service registration is closed: the app is meant to work without an
  // account, and the only accounts that matter are the admin ones, created by
  // hand (see docs/comptes-admin.md). AuthService.signup is left untouched so
  // re-enabling this is a matter of uncommenting the route.
  //
  // @Post('signup')
  // @ApiOperation({ summary: 'Register a new user' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Returns access_token and refresh_token',
  // })
  // @ApiResponse({ status: 409, description: 'Email already in use' })
  // signup(@Body() dto: SignupDto) {
  //   return this.authService.signup(dto.email, dto.password);
  // }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access_token and refresh_token',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access_token and refresh_token',
  })
  @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
  refresh(@Request() req: RefreshRequest) {
    return this.authService.refresh(req.user.id, req.user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(@Request() req: AuthRequest) {
    return this.authService.logout(req.user.id);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  changePassword(@Request() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
