import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from '../otp/otp.service';
import { SafeUser } from '@/common/types/safe-user.type';
import { AuthService } from './auth.service';
import { ForgotPasswordInput } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpInput } from './dto/verify-otp.dto';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { UserRepository } from '../user/repositories/user.repository';

jest.mock('@/common/helpers/hash.helper', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_ID = 'user-id-1';
const IDENTIFIER = 'john@example.com';
const OTP = '123456';
const NONCE = 'abc-nonce-xyz';
const RESET_TOKEN = 'signed.jwt.token';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSafeUser: SafeUser = {
  id: USER_ID,
  email: IDENTIFIER,
  name: 'John Doe',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  role: 'CUSTOMER',
};

const signUpDto = {
  identifierType: 'email' as const,
  email: IDENTIFIER,
  name: 'John',
  password: 'password123',
};

const unverifiedUser = {
  identifierType: 'email' as const,
  name: 'John',
  email: IDENTIFIER,
  phone: null,
  passwordHash: 'hashed',
  createdAt: new Date(),
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStrategy = {
  getIdentifier: jest.fn().mockReturnValue(IDENTIFIER),
  findExistingUser: jest.fn(),
  sendVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  buildContactFields: jest.fn().mockReturnValue({ email: IDENTIFIER }),
  getIdentifierFromCache: jest.fn().mockReturnValue(IDENTIFIER),
};

const mockContactStrategyFactory = {
  resolve: jest.fn().mockReturnValue(mockStrategy),
};

const mockOtpService = {
  generate: jest.fn().mockReturnValue(OTP),
  verify: jest.fn(),
};

const mockAuthCacheRepo = {
  saveUnverifiedUser: jest.fn().mockResolvedValue(undefined),
  getUnverifiedUser: jest.fn(),
  deleteUnverifiedUser: jest.fn().mockResolvedValue(undefined),
  saveResetPasswordNonce: jest.fn().mockResolvedValue(NONCE),
  getResetPasswordNonce: jest.fn(),
  deleteResetPasswordNonce: jest.fn().mockResolvedValue(undefined),
};

const mockUserRepo = {
  create: jest.fn().mockResolvedValue(mockSafeUser),
  findById: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue(RESET_TOKEN), // fix: aligned with RESET_TOKEN constant
  verify: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // ── signUp ─────────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('saves unverified user and sends OTP', async () => {
      mockStrategy.findExistingUser.mockResolvedValue(null);

      const result = await service.signUp(signUpDto);

      expect(mockAuthCacheRepo.saveUnverifiedUser).toHaveBeenCalledWith(
        IDENTIFIER,
        expect.objectContaining({ name: 'John', email: IDENTIFIER }),
      );
      expect(mockOtpService.generate).toHaveBeenCalledWith(IDENTIFIER);
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Verification sent',
        data: { identifier: IDENTIFIER },
      });
    });

    it('throws BadRequestException when user already exists', async () => {
      mockStrategy.findExistingUser.mockResolvedValue({ id: 'uuid' });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── verifyOtp ──────────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    const emailDto = {
      identifierType: 'email' as const,
      email: IDENTIFIER,
      otp: OTP,
    };

    describe('OTP validation', () => {
      it('throws UnauthorizedException when OTP is invalid', async () => {
        mockOtpService.verify.mockReturnValue(false);

        await expect(
          service.verifyOtp({ ...emailDto, verifyReason: 'register' }),
        ).rejects.toThrow(new UnauthorizedException('Invalid or expired OTP'));

        expect(mockOtpService.verify).toHaveBeenCalledWith(OTP, IDENTIFIER);
      });
    });

    describe('verifyReason: register', () => {
      const dto: VerifyOtpInput = { ...emailDto, verifyReason: 'register' };

      beforeEach(() => mockOtpService.verify.mockReturnValue(true));

      it('throws BadRequestException when unverified session is missing', async () => {
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

        await expect(service.verifyOtp(dto)).rejects.toThrow(
          new BadRequestException('Session expired, please sign up again'),
        );
      });

      it('creates user, strips identifierType, clears cache, returns success', async () => {
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue({
          identifierType: 'email',
          email: IDENTIFIER,
          name: 'John Doe',
          passwordHash: 'hashed',
        });

        const result = await service.verifyOtp(dto);

        expect(mockUserRepo.create).toHaveBeenCalledWith({
          email: IDENTIFIER,
          name: 'John Doe',
          passwordHash: 'hashed',
          // identifierType must be absent — it's a cache-only field
        });
        expect(mockAuthCacheRepo.deleteUnverifiedUser).toHaveBeenCalledWith(
          IDENTIFIER,
        );
        expect(result).toEqual({ message: 'Account verified successfully' });
      });
    });

    describe('verifyReason: forgot-password', () => {
      const dto: VerifyOtpInput = {
        ...emailDto,
        verifyReason: 'forgot-password',
      };

      beforeEach(() => mockOtpService.verify.mockReturnValue(true));

      it('throws UnauthorizedException when user is not found', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(null);

        await expect(service.verifyOtp(dto)).rejects.toThrow(
          new UnauthorizedException('Invalid credentials, user not found'),
        );
      });

      it('throws BadRequestException when reset nonce is missing from cache', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);
        mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(null);

        await expect(service.verifyOtp(dto)).rejects.toThrow(
          new BadRequestException(
            'Session expired, please initiate forgot password again',
          ),
        );
      });

      it('returns signed reset token and does NOT delete nonce', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);
        mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);

        const result = await service.verifyOtp(dto);

        expect(mockJwtService.sign).toHaveBeenCalledWith({
          sub: USER_ID,
          nonce: NONCE,
        });
        // nonce must survive — deleted only after actual resetPassword call
        expect(
          mockAuthCacheRepo.deleteResetPasswordNonce,
        ).not.toHaveBeenCalled();
        expect(result).toEqual({
          message: 'OTP verified, you can now reset your password',
          data: { token: RESET_TOKEN },
        });
      });
    });

    describe('phone identifierType', () => {
      it('resolves phone strategy and passes full dto to getIdentifier', async () => {
        const phoneDto: VerifyOtpInput = {
          identifierType: 'phone',
          phone: '+8801712345678',
          otp: OTP,
          verifyReason: 'register',
        };

        mockOtpService.verify.mockReturnValue(false);

        await expect(service.verifyOtp(phoneDto)).rejects.toThrow(
          UnauthorizedException,
        );

        expect(mockContactStrategyFactory.resolve).toHaveBeenCalledWith(
          'phone',
        );
        expect(mockStrategy.getIdentifier).toHaveBeenCalledWith(phoneDto);
      });
    });
  });

  // ── resendOtp ──────────────────────────────────────────────────────────────

  describe('resendOtp', () => {
    it('resends OTP when session is alive', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(unverifiedUser);

      const result = await service.resendOtp({ identifier: IDENTIFIER });

      expect(mockOtpService.generate).toHaveBeenCalledWith(IDENTIFIER);
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Verification resent',
        data: { identifier: IDENTIFIER },
      });
    });

    it('throws BadRequestException when session has expired', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

      await expect(
        service.resendOtp({ identifier: IDENTIFIER }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    const dto: ForgotPasswordInput = {
      identifierType: 'email',
      email: IDENTIFIER,
    };

    it('throws BadRequestException when user is not found', async () => {
      mockStrategy.findExistingUser.mockResolvedValue(null);

      await expect(service.forgotPassword(dto)).rejects.toThrow(
        new BadRequestException('User not found with this identifier'),
      );
    });

    it('saves nonce, generates OTP from nonce, sends reset, returns identifier', async () => {
      mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);

      const result = await service.forgotPassword(dto);

      expect(mockAuthCacheRepo.saveResetPasswordNonce).toHaveBeenCalledWith(
        USER_ID,
      );
      expect(mockOtpService.generate).toHaveBeenCalledWith(NONCE);
      expect(mockStrategy.sendPasswordReset).toHaveBeenCalledWith(
        mockSafeUser,
        OTP,
      );
      expect(result).toEqual({
        message: 'Password reset OTP sent',
        data: { identifier: IDENTIFIER },
      });
    });

    it('resolves phone strategy for phone identifierType', async () => {
      const phoneDto: ForgotPasswordInput = {
        identifierType: 'phone',
        phone: '+8801712345678',
      };
      mockStrategy.findExistingUser.mockResolvedValue(null);

      await expect(service.forgotPassword(phoneDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockContactStrategyFactory.resolve).toHaveBeenCalledWith('phone');
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const dto: ResetPasswordDto = {
      token: RESET_TOKEN,
      newPassword: 'NewP@ss123',
    };

    it('throws BadRequestException when token payload has no nonce', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: undefined });

      await expect(service.resetPassword(dto)).rejects.toThrow(
        new BadRequestException('Invalid token payload'),
      );
    });

    it('throws BadRequestException when cached nonce does not match token nonce', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue('stale-nonce');

      await expect(service.resetPassword(dto)).rejects.toThrow(
        new BadRequestException('Invalid or expired token'),
      );
    });

    it('throws BadRequestException when user is not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });

    it('hashes password, updates user, deletes nonce, returns success', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(mockSafeUser);

      const result = await service.resetPassword(dto);

      expect(mockUserRepo.update).toHaveBeenCalledWith(USER_ID, {
        passwordHash: 'hashed-password',
      });
      expect(mockAuthCacheRepo.deleteResetPasswordNonce).toHaveBeenCalledWith(
        USER_ID,
      );
      expect(result).toEqual({ message: 'Password reset successful' });
    });

    it('does NOT delete nonce when password update fails', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(mockSafeUser);
      mockUserRepo.update.mockRejectedValue(new Error('DB failure'));

      await expect(service.resetPassword(dto)).rejects.toThrow('DB failure');

      expect(mockAuthCacheRepo.deleteResetPasswordNonce).not.toHaveBeenCalled();
    });
  });
});
