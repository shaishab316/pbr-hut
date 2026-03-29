import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { OtpService } from '../otp/otp.service';
import { JwtService } from '@nestjs/jwt';

const mockStrategy = {
  getIdentifier: jest.fn().mockReturnValue('john@example.com'),
  findExistingUser: jest.fn().mockResolvedValue(null),
  sendVerification: jest.fn().mockResolvedValue(undefined),
  buildContactFields: jest.fn().mockReturnValue({ email: 'john@example.com' }),
  getIdentifierFromCache: jest.fn().mockReturnValue('john@example.com'),
};

const mockAuthCacheRepo = {
  saveUnverifiedUser: jest.fn().mockResolvedValue(undefined),
  getUnverifiedUser: jest.fn(),
  deleteUnverifiedUser: jest.fn().mockResolvedValue(undefined),
};

const mockUserRepo = {
  create: jest
    .fn()
    .mockResolvedValue({ id: 'uuid', name: 'John', email: 'john@example.com' }),
};

const mockContactStrategyFactory = {
  resolve: jest.fn().mockReturnValue(mockStrategy),
};

const mockOtpService = {
  generate: jest.fn().mockReturnValue('123456'),
  verify: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const signUpDto = {
  identifierType: 'email' as const,
  email: 'john@example.com',
  name: 'John',
  password: 'password123',
};

const unverifiedUser = {
  name: 'John',
  email: 'john@example.com',
  phone: null,
  passwordHash: 'hashed',
  createdAt: new Date(),
  identifierType: 'email' as const,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthCacheRepository, useValue: mockAuthCacheRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        {
          provide: ContactStrategyFactory,
          useValue: mockContactStrategyFactory,
        },
        { provide: OtpService, useValue: mockOtpService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should save unverified user and send OTP', async () => {
      mockStrategy.findExistingUser.mockResolvedValue(null);

      const result = await service.signUp(signUpDto);

      expect(mockAuthCacheRepo.saveUnverifiedUser).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({ name: 'John', email: 'john@example.com' }),
      );
      expect(mockOtpService.generate).toHaveBeenCalledWith('john@example.com');
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Verification sent',
        data: { identifier: 'john@example.com' },
      });
    });

    it('should throw if user already exists', async () => {
      mockStrategy.findExistingUser.mockResolvedValue({ id: 'uuid' });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyOtp', () => {
    it('should create user and delete cache on valid OTP', async () => {
      mockOtpService.verify.mockReturnValue(true);
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(unverifiedUser);

      const result = await service.verifyOtp({
        identifier: 'john@example.com',
        otp: '123456',
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { identifierType, ...expectedUserData } = unverifiedUser;

      expect(mockUserRepo.create).toHaveBeenCalledWith(expectedUserData);
      expect(mockAuthCacheRepo.deleteUnverifiedUser).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(result).toEqual({ message: 'Account verified successfully' });
    });

    it('should throw on invalid OTP', async () => {
      mockOtpService.verify.mockReturnValue(false);

      await expect(
        service.verifyOtp({ identifier: 'john@example.com', otp: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if session expired', async () => {
      mockOtpService.verify.mockReturnValue(true);
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ identifier: 'john@example.com', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP if session is alive', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(unverifiedUser);

      const result = await service.resendOtp({
        identifier: 'john@example.com',
      });

      expect(mockOtpService.generate).toHaveBeenCalledWith('john@example.com');
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Verification resent',
        data: { identifier: 'john@example.com' },
      });
    });

    it('should throw if session expired', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

      await expect(
        service.resendOtp({ identifier: 'john@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return token and safe user on valid credentials', async () => {});
  });
});
