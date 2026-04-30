import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthCacheRepository,
  UnverifiedRider,
  type UnverifiedUser,
} from './repository/auth.cache.repository';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import {
  comparePassword,
  generateNonceWithHash,
  hashNonce,
  hashPassword,
} from '@/common/helpers';
import type { SignUpInput } from './dto/sign-up.dto';
import { OtpService } from '../otp/otp.service';
import { VerifyOtpFlow, VerifyOtpInput } from './dto/verify-otp.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginInput } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/strategies/jwt.strategy';
import { ForgotPasswordInput } from './dto/forgot-password.dto';
import { SafeUser } from '@/common/types/safe-user.type';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RiderSignUpDto } from './dto/rider-sign-up.dto';
import { UserRole, NotificationType } from '@prisma/client';
import { RiderRepository } from '../rider/repositories/rider.repository';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { NotificationService } from '@/infra/notification/notification.service';

export type ResetPasswordTokenPayload = {
  sub: string; // userId
  nonce: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
    private readonly userRepo: UserRepository,
    private readonly riderRepo: RiderRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly contactStrategyFactory: ContactStrategyFactory,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async signUp(signUpDto: SignUpInput) {
    this.logger.log(
      `📝 Sign up attempt: ${signUpDto.identifierType} - ${signUpDto.name}`,
    );

    try {
      const strategy = this.contactStrategyFactory.resolve(
        signUpDto.identifierType,
      );

      const existingUser = await strategy.findExistingUser(signUpDto);
      if (existingUser) {
        this.logger.warn(
          `⚠️ Sign up failed: User already exists - ${signUpDto.identifierType}`,
        );
        throw new BadRequestException(
          'Already have an account with this identifier, please login instead',
        );
      }

      const identifier = strategy.getIdentifier(signUpDto);

      const unverifiedUser = {
        role: UserRole.CUSTOMER,

        name: signUpDto.name,
        ...strategy.buildContactFields(signUpDto),
        passwordHash: await hashPassword(signUpDto.password),
        createdAt: new Date(),

        //? We need this to know which strategy to use when resending OTP or verifying from cache
        identifierType: signUpDto.identifierType,
      } satisfies UnverifiedUser;

      await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);
      this.logger.debug(`💾 Unverified user saved to cache: ${identifier}`);

      await this.sendOtp(unverifiedUser);
      this.logger.log(`📧 OTP sent for registration: ${identifier}`);

      return { identifier };
    } catch (error) {
      this.logger.error(
        `❌ Sign up failed for ${signUpDto.identifierType}:`,
        error,
      );
      throw error;
    }
  }

  async verifyOtp(
    dto: VerifyOtpInput,
  ): Promise<{ flow: VerifyOtpFlow; data?: any }> {
    this.logger.debug(
      `🔐 OTP verification attempt: ${dto.identifierType} - Flow: ${dto.flow}`,
    );

    try {
      const strategy = this.contactStrategyFactory.resolve(dto.identifierType);

      const identifier = strategy.getIdentifier(dto);

      //? route using flow
      if (dto.flow === 'register') {
        this.logger.log(`✅ Verifying OTP for registration: ${identifier}`);
        return this.verifyOtpForRegistration(identifier, dto.otp);
      }

      const user = await strategy.findExistingUser(dto);

      if (!user) {
        this.logger.warn(
          `⚠️ OTP verification failed: User not found - ${identifier}`,
        );
        throw new UnauthorizedException('Invalid credentials, user not found');
      }

      this.logger.log(`✅ Verifying OTP for password reset: ${identifier}`);
      return this.verifyOtpForPasswordReset(user, dto.otp);
    } catch (error) {
      this.logger.error('❌ OTP verification failed:', error);
      throw error;
    }
  }

  private async verifyOtpForRegistration(identifier: string, otp: string) {
    this.logger.debug(`🔍 Verifying OTP for registration: ${identifier}`);

    const isValid = this.otpService.verify(otp, identifier);

    if (!isValid) {
      this.logger.warn(
        `⚠️ Invalid or expired OTP for registration: ${identifier}`,
      );
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const unverifiedUser =
      await this.authCacheRepo.getUnverifiedUser(identifier);

    if (!unverifiedUser) {
      this.logger.warn(`⚠️ Session expired for registration: ${identifier}`);
      throw new BadRequestException('Session expired, please sign up again');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { identifierType, ...userData } = unverifiedUser;

    await this.authCacheRepo.deleteUnverifiedUser(identifier);

    switch (userData.role) {
      case UserRole.CUSTOMER: {
        const user = await this.userRepo.create(userData);
        this.logger.log(`✅ Customer registered successfully: ${user.id}`);

        // 📬 Send welcome notification to customer
        await this.notificationService.sendNotification(
          [user.id],
          '🎉 Welcome to PBR Hut!',
          `Welcome ${user.name}! Your account has been created successfully. Start ordering delicious food now!`,
          NotificationType.INFO,
        );
        break;
      }
      case UserRole.RIDER: {
        const { latitude, longitude, ...riderData } = userData;
        const h3Index = H3IndexUtil.encodeH3(latitude, longitude);

        const user = await this.userRepo.create(riderData);
        this.logger.log(
          `✅ Rider registered successfully: ${user.id} at H3: ${h3Index}`,
        );

        await this.riderRepo.createProfile({
          user: {
            connect: { id: user.id },
          },

          latitude,
          longitude,
          h3Index,
        });

        // 📬 Send welcome notification to rider
        await this.notificationService.sendNotification(
          [user.id],
          '🚗 Welcome to PBR Hut Riders!',
          `Welcome ${user.name}! Your rider account is ready. Start accepting orders and earning money!`,
          NotificationType.INFO,
        );
        break;
      }
    }

    return { flow: 'register' as const };
  }

  private async verifyOtpForPasswordReset(user: SafeUser, otp: string) {
    const nonce = await this.authCacheRepo.getPasswordResetNonce(user.id);

    if (!nonce) {
      throw new BadRequestException(
        'Session expired, please initiate forgot password again',
      );
    }

    const isValid = this.otpService.verify(otp, nonce);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    //! dont delete nonce from cache here, we will delete it after password reset to prevent multiple OTP verifications and ensure that the user resets the password immediately after verifying OTP

    const token = this.jwtService.sign({
      sub: user.id,
      nonce,
    } satisfies ResetPasswordTokenPayload);

    return {
      flow: 'forgot-password' as const,
      data: {
        token,
      },
    };
  }

  private async sendOtp<T extends UnverifiedUser | UnverifiedRider>(user: T) {
    const strategy = this.contactStrategyFactory.resolve(user.identifierType);

    const identifier = strategy.getIdentifierFromCache(user);

    const otp = this.otpService.generate(identifier);

    await strategy.sendVerification(user, otp);
  }

  async resendOtp(dto: ResendOtpDto) {
    const unverifiedUser = await this.authCacheRepo.getUnverifiedUser(
      dto.identifier,
    );

    if (!unverifiedUser) {
      throw new BadRequestException('Session expired, please sign up again');
    }

    await this.sendOtp(unverifiedUser);

    return { identifier: dto.identifier };
  }

  async login(loginDto: LoginInput) {
    const strategy = this.contactStrategyFactory.resolve(
      loginDto.identifierType,
    );

    const user = await strategy.findExistingUserWithPassword(loginDto);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials, user not found');
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Invalid credentials, incorrect password',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      identifier: strategy.getIdentifier(loginDto),
    };

    const token = this.jwtService.sign(payload);

    const { nonce: refreshToken, hash: tokenHash } = generateNonceWithHash(32);

    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    return {
      token,
      refreshToken,
      user: safeUser,
    };
  }

  async refreshAccessToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const tokenHash = hashNonce(refreshTokenDto.refreshToken);

      const storedToken =
        await this.refreshTokenRepo.findByTokenHash(tokenHash);

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const safeUser = storedToken.user;

      const payload: JwtPayload = {
        sub: safeUser.id,
        identifier: safeUser.email || safeUser.phone || safeUser.id,
      };

      const newAccessToken = this.jwtService.sign(payload);

      const { nonce: newRefreshToken, hash: newTokenHash } =
        generateNonceWithHash(32);

      // Rotate refresh token to prevent replay.
      await this.refreshTokenRepo.delete(tokenHash);
      await this.refreshTokenRepo.create({
        userId: safeUser.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        user: safeUser,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordInput) {
    const strategy = this.contactStrategyFactory.resolve(dto.identifierType);
    const identifier = strategy.getIdentifier(dto);

    const user = await strategy.findExistingUser(dto);
    if (user) {
      const nonce = await this.authCacheRepo.createPasswordResetNonce(user.id);

      const otp = this.otpService.generate(nonce);

      await strategy.sendPasswordReset(user, otp);

      // 📬 Send notification about password reset initiation
      await this.notificationService.sendNotification(
        [user.id],
        '🔑 Password Reset Initiated',
        'You requested a password reset. Check your email or phone for an OTP to proceed. This code expires in 10 minutes.',
        NotificationType.INFO,
      );
    }

    return { identifier };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const payload: ResetPasswordTokenPayload = this.jwtService.verify(
      dto.token,
    );

    if (!payload.nonce) {
      throw new BadRequestException('Invalid token payload');
    }

    const nonceInCache = await this.authCacheRepo.getPasswordResetNonce(
      payload.sub,
    );

    if (nonceInCache !== payload.nonce) {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.userRepo.findById(payload.sub);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.userRepo.update(user.id, {
      passwordHash: await hashPassword(dto.newPassword),
    });

    await this.authCacheRepo.deletePasswordResetNonce(user.id);

    // 📬 Send notification about successful password reset
    await this.notificationService.sendNotification(
      [user.id],
      '✅ Password Changed Successfully',
      'Your password has been reset successfully. If this was not you, please contact support immediately.',
      NotificationType.INFO,
    );
  }

  async riderSignUp(signUpDto: RiderSignUpDto) {
    const strategy = this.contactStrategyFactory.resolve('email');

    const existingUser = await strategy.findExistingUser({
      ...signUpDto,
      identifierType: 'email',
    });

    const phoneExistingUser = await this.userRepo.findByPhone(signUpDto.phone);

    if (existingUser) {
      throw new BadRequestException(
        'Already have an account with this email identifier, please login instead',
      );
    }

    if (phoneExistingUser) {
      throw new BadRequestException(
        'Already have an account with this phone number, please login instead',
      );
    }

    const identifier = strategy.getIdentifier({
      ...signUpDto,
      identifierType: 'email',
    });

    const unverifiedUser = {
      role: UserRole.RIDER,

      name: signUpDto.name,
      email: signUpDto.email,
      phone: signUpDto.phone,
      passwordHash: await hashPassword(signUpDto.password),
      createdAt: new Date(),

      latitude: signUpDto.latitude,
      longitude: signUpDto.longitude,

      //? We need this to know which strategy to use when resending OTP or verifying from cache
      identifierType: 'email',
    } satisfies UnverifiedRider;

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    await this.sendOtp(unverifiedUser);

    return { identifier };
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const deletedCount = await this.refreshTokenRepo.deleteExpired();
    this.logger.log(`🗑️  Deleted ${deletedCount} expired refresh tokens`);
    return deletedCount;
  }
}
