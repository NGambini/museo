import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-uuid',
  email: 'test@example.com',
  password: 'hashed_password',
  refreshToken: 'hashed_refresh_token',
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('throws ConflictException if the email is already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.signup('test@example.com', 'password'),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the user and returns tokens if the email is available', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.signup('new@example.com', 'password');

      expect(mockUsersService.create).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String), // hashed password
      );
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException if the user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if the password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns tokens if the credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.login('test@example.com', 'correct');

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });
  });

  describe('refresh', () => {
    it('throws ForbiddenException if the user is not found', async () => {
      mockUsersService.findById.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(service.refresh('bad-id', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if the user has no refreshToken', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refresh('user-uuid', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if the refreshToken does not match', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('user-uuid', 'wrong_token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns new tokens if the refreshToken is valid', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      const result = await service.refresh('user-uuid', 'valid_refresh_token');

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });
  });

  describe('logout', () => {
    it('calls updateRefreshToken with null', async () => {
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-uuid');

      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-uuid',
        null,
      );
    });
  });
});
