import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { OtpService } from '../otp/otp.service';
import { UserRepository } from '../user/repositories/user.repository';
import { RiderRepository } from '../rider/repositories/rider.repository';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import * as helpers from '@/common/helpers';

jest.mock('@/common/helpers', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn(),
}));

jest.mock('@/common/utils/h3index.util', () => ({
  H3IndexUtil: {
    encodeH3: jest.fn().mockReturnValue('h3index_mock'),
  },
}));

const mockStrategy = {
  findExistingUser: jest.fn(),
  findExistingUserWithPassword: jest.fn(),
  getIdentifier: jest.fn().mockReturnValue('test@example.com'),
  getIdentifierFromCache: jest.fn().mockReturnValue('test@example.com'),
  buildContactFields: jest.fn().mockReturnValue({ email: 'test@example.com' }),
  sendVerification: jest.fn(),
  sendPasswordReset: jest.fn(),
};

const mockAuthCacheRepo = {
  saveUnverifiedUser: jest.fn(),
  getUnverifiedUser: jest.fn(),
  deleteUnverifiedUser: jest.fn(),
  createPasswordResetNonce: jest.fn().mockResolvedValue('nonce123'),
  getPasswordResetNonce: jest.fn(),
  deletePasswordResetNonce: jest.fn(),
};

const mockUserRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

const mockRiderRepo = {
  createProfile: jest.fn(),
};

const mockContactStrategyFactory = {
  resolve: jest.fn().mockReturnValue(mockStrategy),
};

const mockOtpService = {
  generate: jest.fn().mockReturnValue('123456'),
  verify: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('jwt_token'),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthCacheRepository, useValue: mockAuthCacheRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: RiderRepository, useValue: mockRiderRepo },
        {
          provide: ContactStrategyFactory,
          useValue: mockContactStrategyFactory,
        },
        { provide: OtpService, useValue: mockOtpService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    const dto = {
      identifierType: 'email' as const,
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw if user already exists', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce({ id: '1' });
      await expect(service.signUp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should save unverified user and send OTP', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce(null);

      const result = await service.signUp(dto);

      expect(mockAuthCacheRepo.saveUnverifiedUser).toHaveBeenCalled();
      expect(mockOtpService.generate).toHaveBeenCalled();
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({ identifier: 'test@example.com' });
    });
  });

  describe('verifyOtp', () => {
    const baseDto = {
      identifierType: 'email' as const,
      otp: '123456',
      email: 'test@example.com',
    };

    it('should throw if OTP is invalid', async () => {
      mockOtpService.verify.mockReturnValueOnce(false);
      await expect(
        service.verifyOtp({ ...baseDto, flow: 'register' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    describe('register flow', () => {
      it('should throw if unverified user not in cache', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValueOnce(null);

        await expect(
          service.verifyOtp({ ...baseDto, flow: 'register' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should create customer and return register flow', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValueOnce({
          identifierType: 'email',
          role: UserRole.CUSTOMER,
          name: 'Test',
          email: 'test@example.com',
          passwordHash: 'hash',
          createdAt: new Date(),
        });
        mockUserRepo.create.mockResolvedValueOnce({ id: 'user1' });

        const result = await service.verifyOtp({
          ...baseDto,
          flow: 'register',
        });

        expect(mockUserRepo.create).toHaveBeenCalled();
        expect(result).toEqual({ flow: 'register' });
      });

      it('should create rider profile when role is RIDER', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValueOnce({
          identifierType: 'email',
          role: UserRole.RIDER,
          name: 'Rider',
          email: 'rider@example.com',
          passwordHash: 'hash',
          createdAt: new Date(),
          latitude: 23.8,
          longitude: 90.4,
        });
        mockUserRepo.create.mockResolvedValueOnce({ id: 'rider1' });

        const result = await service.verifyOtp({
          ...baseDto,
          flow: 'register',
        });

        expect(H3IndexUtil.encodeH3).toHaveBeenCalledWith(23.8, 90.4);
        expect(mockRiderRepo.createProfile).toHaveBeenCalled();
        expect(result).toEqual({ flow: 'register' });
      });
    });

    describe('forgot-password flow', () => {
      it('should throw if user not found', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockStrategy.findExistingUser.mockResolvedValueOnce(null);

        await expect(
          service.verifyOtp({ ...baseDto, flow: 'forgot-password' }),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw if nonce not in cache', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockStrategy.findExistingUser.mockResolvedValueOnce({ id: 'user1' });
        mockAuthCacheRepo.getPasswordResetNonce.mockResolvedValueOnce(null);

        await expect(
          service.verifyOtp({ ...baseDto, flow: 'forgot-password' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should return token on valid forgot-password flow', async () => {
        mockOtpService.verify.mockReturnValueOnce(true);
        mockStrategy.findExistingUser.mockResolvedValueOnce({ id: 'user1' });
        mockAuthCacheRepo.getPasswordResetNonce.mockResolvedValueOnce(
          'nonce123',
        );

        const result = await service.verifyOtp({
          ...baseDto,
          flow: 'forgot-password',
        });

        expect(mockJwtService.sign).toHaveBeenCalled();
        expect(result).toEqual({
          flow: 'forgot-password',
          data: { token: 'jwt_token' },
        });
      });
    });
  });

  describe('resendOtp', () => {
    it('should throw if session expired', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValueOnce(null);
      await expect(
        service.resendOtp({ identifier: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resend OTP successfully', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValueOnce({
        identifierType: 'email',
        email: 'test@example.com',
      });

      const result = await service.resendOtp({
        identifier: 'test@example.com',
      });

      expect(mockOtpService.generate).toHaveBeenCalled();
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({ identifier: 'test@example.com' });
    });
  });

  describe('login', () => {
    const dto = {
      identifierType: 'email' as const,
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw if user not found', async () => {
      mockStrategy.findExistingUserWithPassword.mockResolvedValueOnce(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is invalid', async () => {
      mockStrategy.findExistingUserWithPassword.mockResolvedValueOnce({
        id: 'user1',
        passwordHash: 'hash',
      });
      (helpers.comparePassword as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and safe user on success', async () => {
      mockStrategy.findExistingUserWithPassword.mockResolvedValueOnce({
        id: 'user1',
        email: 'test@example.com',
        passwordHash: 'hash',
      });
      (helpers.comparePassword as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login(dto);

      expect(result.data.token).toBe('jwt_token');
      expect(result.data.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('forgotPassword', () => {
    const dto = { identifierType: 'email' as const, email: 'test@example.com' };

    it('should throw if user not found', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce(null);
      await expect(service.forgotPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate nonce, OTP and send reset email', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce({ id: 'user1' });

      const result = await service.forgotPassword(dto);

      expect(mockAuthCacheRepo.createPasswordResetNonce).toHaveBeenCalledWith(
        'user1',
      );
      expect(mockOtpService.generate).toHaveBeenCalledWith('nonce123');
      expect(mockStrategy.sendPasswordReset).toHaveBeenCalled();
      expect(result).toEqual({ identifier: 'test@example.com' });
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'jwt_token', newPassword: 'newpass123' };

    it('should throw if token payload has no nonce', async () => {
      mockJwtService.verify.mockReturnValueOnce({ sub: 'user1', nonce: null });
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if nonce mismatch', async () => {
      mockJwtService.verify.mockReturnValueOnce({ sub: 'user1', nonce: 'abc' });
      mockAuthCacheRepo.getPasswordResetNonce.mockResolvedValueOnce('xyz');

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if user not found', async () => {
      mockJwtService.verify.mockReturnValueOnce({
        sub: 'user1',
        nonce: 'nonce123',
      });
      mockAuthCacheRepo.getPasswordResetNonce.mockResolvedValueOnce('nonce123');
      mockUserRepo.findById.mockResolvedValueOnce(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update password and delete nonce', async () => {
      mockJwtService.verify.mockReturnValueOnce({
        sub: 'user1',
        nonce: 'nonce123',
      });
      mockAuthCacheRepo.getPasswordResetNonce.mockResolvedValueOnce('nonce123');
      mockUserRepo.findById.mockResolvedValueOnce({ id: 'user1' });

      await service.resetPassword(dto);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user1', {
        passwordHash: 'hashed_password',
      });
      expect(mockAuthCacheRepo.deletePasswordResetNonce).toHaveBeenCalledWith(
        'user1',
      );
    });
  });

  describe('riderSignUp', () => {
    const dto = {
      name: 'Rider',
      email: 'rider@example.com',
      phone: '01700000000',
      password: 'pass123',
      latitude: 23.8,
      longitude: 90.4,
    };

    it('should throw if rider already exists', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce({ id: '1' });
      await expect(service.riderSignUp(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save unverified rider and send OTP', async () => {
      mockStrategy.findExistingUser.mockResolvedValueOnce(null);

      const result = await service.riderSignUp(dto);

      expect(mockAuthCacheRepo.saveUnverifiedUser).toHaveBeenCalled();
      expect(mockOtpService.generate).toHaveBeenCalled();
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({ identifier: 'test@example.com' });
    });
  });
});
