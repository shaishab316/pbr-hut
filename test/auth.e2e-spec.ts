/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { SafeUser } from '@/common/types/safe-user.type';

jest.mock('@/common/helpers/hash.helper', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn(),
}));

import { comparePassword } from '@/common/helpers/hash.helper';
import { AuthCacheRepository } from '@/modules/auth/repository/auth.cache.repository';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { ContactStrategyFactory } from '@/modules/auth/strategies/contact.strategy.factory';
import { OtpService } from '@/modules/otp/otp.service';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_ID = 'user-id-1';
const EMAIL = 'john@example.com';
const PHONE = '+8801712345678';
const OTP = '123456';
const NONCE = 'abc-nonce-xyz';
const RESET_TOKEN = 'signed.jwt.token';
const PASSWORD = 'Password123';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSafeUser: SafeUser = {
  id: USER_ID,
  email: EMAIL,
  name: 'John Doe',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  role: 'CUSTOMER',
};

const mockUserWithPassword = {
  ...mockSafeUser,
  passwordHash: 'hashed-password',
};

const unverifiedUser = {
  identifierType: 'email' as const,
  name: 'John Doe',
  email: EMAIL,
  phone: null,
  passwordHash: 'hashed-password',
  createdAt: new Date(),
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStrategy = {
  getIdentifier: jest.fn().mockReturnValue(EMAIL),
  findExistingUser: jest.fn(),
  findExistingUserWithPassword: jest.fn(),
  sendVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  buildContactFields: jest.fn().mockReturnValue({ email: EMAIL, phone: null }),
  getIdentifierFromCache: jest.fn().mockReturnValue(EMAIL),
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
  findByEmail: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue(RESET_TOKEN),
  verify: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: AuthCacheRepository, useValue: mockAuthCacheRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        {
          provide: ContactStrategyFactory,
          useValue: mockContactStrategyFactory,
        },
        { provide: OtpService, useValue: mockOtpService },
      ],
    })
      .overrideProvider(JwtService)
      .useValue(mockJwtService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // reset strategy mock back to email defaults after each test
    mockStrategy.getIdentifier.mockReturnValue(EMAIL);
    mockStrategy.getIdentifierFromCache.mockReturnValue(EMAIL);
    mockStrategy.buildContactFields.mockReturnValue({
      email: EMAIL,
      phone: null,
    });
  });

  // ── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const url = '/auth/register';

    describe('email flow', () => {
      const payload = {
        identifierType: 'email',
        email: EMAIL,
        name: 'John Doe',
        password: PASSWORD,
      };

      it('200 – saves unverified user and sends OTP', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(200);

        expect(res.body).toEqual({
          message: 'Verification sent',
          data: { identifier: EMAIL },
        });
        expect(mockAuthCacheRepo.saveUnverifiedUser).toHaveBeenCalledWith(
          EMAIL,
          expect.objectContaining({ name: 'John Doe', email: EMAIL }),
        );
        expect(mockOtpService.generate).toHaveBeenCalledWith(EMAIL);
        expect(mockStrategy.sendVerification).toHaveBeenCalled();
      });

      it('400 – user already exists', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(400);

        expect(res.body.message).toMatch(/already have an account/i);
      });
    });

    describe('phone flow', () => {
      const payload = {
        identifierType: 'phone',
        phone: PHONE,
        name: 'John Doe',
        password: PASSWORD,
      };

      it('200 – registers with phone identifier', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(null);
        mockStrategy.getIdentifier.mockReturnValue(PHONE);
        mockStrategy.getIdentifierFromCache.mockReturnValue(PHONE);
        mockStrategy.buildContactFields.mockReturnValue({
          phone: PHONE,
          email: null,
        });

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(200);

        expect(res.body.message).toBe('Verification sent');
        expect(mockContactStrategyFactory.resolve).toHaveBeenCalledWith(
          'phone',
        );
      });
    });

    describe('validation', () => {
      it('400 – missing name', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'email', email: EMAIL, password: PASSWORD })
          .expect(400);
      });

      it('400 – invalid email format', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({
            identifierType: 'email',
            email: 'not-an-email',
            name: 'John',
            password: PASSWORD,
          })
          .expect(400);
      });

      it('400 – password too short', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({
            identifierType: 'email',
            email: EMAIL,
            name: 'John',
            password: 'short',
          })
          .expect(400);
      });

      it('400 – password too long (> 32 chars)', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({
            identifierType: 'email',
            email: EMAIL,
            name: 'John',
            password: 'a'.repeat(33),
          })
          .expect(400);
      });

      it('400 – invalid phone number format', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({
            identifierType: 'phone',
            phone: '123',
            name: 'John',
            password: PASSWORD,
          })
          .expect(400);
      });
    });
  });

  // ── POST /auth/verify-otp ──────────────────────────────────────────────────

  describe('POST /auth/verify-otp', () => {
    const url = '/auth/verify-otp';

    const basePayload = {
      identifierType: 'email',
      email: EMAIL,
      otp: OTP,
      verifyReason: 'register',
    };

    describe('OTP validation', () => {
      it('401 – invalid OTP', async () => {
        mockOtpService.verify.mockReturnValue(false);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(basePayload)
          .expect(401);

        expect(res.body.message).toBe('Invalid or expired OTP');
      });
    });

    describe('verifyReason: register', () => {
      beforeEach(() => mockOtpService.verify.mockReturnValue(true));

      it('200 – verifies OTP, creates user, clears session', async () => {
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(unverifiedUser);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(basePayload)
          .expect(200);

        expect(res.body).toEqual({ message: 'Account verified successfully' });
        expect(mockUserRepo.create).toHaveBeenCalledWith(
          expect.not.objectContaining({ identifierType: expect.anything() }),
        );
        expect(mockAuthCacheRepo.deleteUnverifiedUser).toHaveBeenCalledWith(
          EMAIL,
        );
      });

      it('400 – session expired (no unverified user in cache)', async () => {
        mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(basePayload)
          .expect(400);

        expect(res.body.message).toBe('Session expired, please sign up again');
      });
    });

    describe('verifyReason: forgot-password', () => {
      const payload = { ...basePayload, verifyReason: 'forgot-password' };

      beforeEach(() => mockOtpService.verify.mockReturnValue(true));

      it('200 – returns reset token when OTP and nonce are valid', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);
        mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(200);

        expect(res.body).toEqual({
          message: 'OTP verified, you can now reset your password',
          data: { token: RESET_TOKEN },
        });
        // nonce must NOT be deleted here
        expect(
          mockAuthCacheRepo.deleteResetPasswordNonce,
        ).not.toHaveBeenCalled();
      });

      it('401 – user not found', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(401);

        expect(res.body.message).toBe('Invalid credentials, user not found');
      });

      it('400 – reset nonce missing from cache', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);
        mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(400);

        expect(res.body.message).toBe(
          'Session expired, please initiate forgot password again',
        );
      });
    });

    describe('validation', () => {
      it('400 – OTP not 6 digits', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ ...basePayload, otp: '123' })
          .expect(400);
      });

      it('400 – invalid verifyReason', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ ...basePayload, verifyReason: 'unknown-reason' })
          .expect(400);
      });

      it('400 – missing otp field', async () => {
        const { otp: _, ...withoutOtp } = basePayload;
        await request(app.getHttpServer())
          .post(url)
          .send(withoutOtp)
          .expect(400);
      });
    });
  });

  // ── POST /auth/resend-otp ──────────────────────────────────────────────────

  describe('POST /auth/resend-otp', () => {
    const url = '/auth/resend-otp';

    it('200 – resends OTP when session is alive', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(unverifiedUser);

      const res = await request(app.getHttpServer())
        .post(url)
        .send({ identifier: EMAIL })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Verification resent',
        data: { identifier: EMAIL },
      });
      expect(mockOtpService.generate).toHaveBeenCalledWith(EMAIL);
      expect(mockStrategy.sendVerification).toHaveBeenCalled();
    });

    it('400 – session expired', async () => {
      mockAuthCacheRepo.getUnverifiedUser.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(url)
        .send({ identifier: EMAIL })
        .expect(400);

      expect(res.body.message).toBe('Session expired, please sign up again');
    });

    describe('validation', () => {
      it('400 – empty identifier', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifier: '' })
          .expect(400);
      });

      it('400 – missing identifier field', async () => {
        await request(app.getHttpServer()).post(url).send({}).expect(400);
      });
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const url = '/auth/login';

    describe('email flow', () => {
      const payload = {
        identifierType: 'email',
        email: EMAIL,
        password: PASSWORD,
      };

      it('200 – returns JWT token and safe user on valid credentials', async () => {
        mockStrategy.findExistingUserWithPassword.mockResolvedValue(
          mockUserWithPassword,
        );
        (comparePassword as jest.Mock).mockResolvedValue(true);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(200);

        expect(res.body.message).toBe('Login successful');
        expect(res.body.data.token).toBe(RESET_TOKEN);
        expect(res.body.data.user).not.toHaveProperty('passwordHash');
      });

      it('401 – user not found', async () => {
        mockStrategy.findExistingUserWithPassword.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(401);

        expect(res.body.message).toMatch(/user not found/i);
      });

      it('401 – incorrect password', async () => {
        mockStrategy.findExistingUserWithPassword.mockResolvedValue(
          mockUserWithPassword,
        );
        (comparePassword as jest.Mock).mockResolvedValue(false);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(401);

        expect(res.body.message).toMatch(/incorrect password/i);
      });
    });

    describe('phone flow', () => {
      it('200 – logs in with phone identifier', async () => {
        mockStrategy.findExistingUserWithPassword.mockResolvedValue(
          mockUserWithPassword,
        );
        mockStrategy.getIdentifier.mockReturnValue(PHONE);
        (comparePassword as jest.Mock).mockResolvedValue(true);

        const res = await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'phone', phone: PHONE, password: PASSWORD })
          .expect(200);

        expect(res.body.message).toBe('Login successful');
        expect(mockContactStrategyFactory.resolve).toHaveBeenCalledWith(
          'phone',
        );
      });
    });

    describe('validation', () => {
      it('400 – missing password', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'email', email: EMAIL })
          .expect(400);
      });

      it('400 – password too short', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'email', email: EMAIL, password: 'short' })
          .expect(400);
      });

      it('400 – invalid email', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({
            identifierType: 'email',
            email: 'bad-email',
            password: PASSWORD,
          })
          .expect(400);
      });
    });
  });

  // ── POST /auth/forgot-password ─────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    const url = '/auth/forgot-password';

    describe('email flow', () => {
      const payload = { identifierType: 'email', email: EMAIL };

      it('200 – sends OTP and returns identifier', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(200);

        expect(res.body).toEqual({
          message: 'Password reset OTP sent',
          data: { identifier: EMAIL },
        });
        expect(mockAuthCacheRepo.saveResetPasswordNonce).toHaveBeenCalledWith(
          USER_ID,
        );
        // OTP generated from nonce, not from email
        expect(mockOtpService.generate).toHaveBeenCalledWith(NONCE);
        expect(mockStrategy.sendPasswordReset).toHaveBeenCalledWith(
          mockSafeUser,
          OTP,
        );
      });

      it('400 – user not found', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(null);

        const res = await request(app.getHttpServer())
          .post(url)
          .send(payload)
          .expect(400);

        expect(res.body.message).toBe('User not found with this identifier');
      });
    });

    describe('phone flow', () => {
      it('200 – sends reset OTP to phone user', async () => {
        mockStrategy.findExistingUser.mockResolvedValue(mockSafeUser);
        mockStrategy.getIdentifier.mockReturnValue(PHONE);

        const res = await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'phone', phone: PHONE })
          .expect(200);

        expect(res.body.message).toBe('Password reset OTP sent');
        expect(mockContactStrategyFactory.resolve).toHaveBeenCalledWith(
          'phone',
        );
      });
    });

    describe('validation', () => {
      it('400 – invalid email format', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'email', email: 'not-valid' })
          .expect(400);
      });

      it('400 – invalid phone format', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'phone', phone: '123' })
          .expect(400);
      });

      it('400 – missing email field when identifierType is email', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ identifierType: 'email' })
          .expect(400);
      });
    });
  });

  // ── POST /auth/reset-password ──────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    const url = '/auth/reset-password';

    const payload = { token: RESET_TOKEN, newPassword: 'NewP@ss123' };

    it('200 – resets password, deletes nonce, returns success', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(mockSafeUser);

      const res = await request(app.getHttpServer())
        .post(url)
        .send(payload)
        .expect(200);

      expect(res.body).toEqual({ message: 'Password reset successful' });
      expect(mockUserRepo.update).toHaveBeenCalledWith(USER_ID, {
        passwordHash: 'hashed-password',
      });
      expect(mockAuthCacheRepo.deleteResetPasswordNonce).toHaveBeenCalledWith(
        USER_ID,
      );
    });

    it('400 – token payload has no nonce', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: undefined });

      const res = await request(app.getHttpServer())
        .post(url)
        .send(payload)
        .expect(400);

      expect(res.body.message).toBe('Invalid token payload');
    });

    it('400 – cached nonce does not match token nonce', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue('stale-nonce');

      const res = await request(app.getHttpServer())
        .post(url)
        .send(payload)
        .expect(400);

      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('400 – user not found after nonce validation', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(url)
        .send(payload)
        .expect(400);

      expect(res.body.message).toBe('User not found');
    });

    it('does NOT delete nonce when update fails', async () => {
      mockJwtService.verify.mockReturnValue({ sub: USER_ID, nonce: NONCE });
      mockAuthCacheRepo.getResetPasswordNonce.mockResolvedValue(NONCE);
      mockUserRepo.findById.mockResolvedValue(mockSafeUser);
      mockUserRepo.update.mockRejectedValue(new Error('DB failure'));

      await request(app.getHttpServer()).post(url).send(payload).expect(500);

      expect(mockAuthCacheRepo.deleteResetPasswordNonce).not.toHaveBeenCalled();
    });

    describe('validation', () => {
      it('400 – missing token', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ newPassword: 'NewP@ss123' })
          .expect(400);
      });

      it('400 – new password too short', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ token: RESET_TOKEN, newPassword: 'short' })
          .expect(400);
      });

      it('400 – new password too long', async () => {
        await request(app.getHttpServer())
          .post(url)
          .send({ token: RESET_TOKEN, newPassword: 'a'.repeat(33) })
          .expect(400);
      });
    });
  });
});
