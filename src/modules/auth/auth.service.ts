import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthCacheRepository,
  type UnverifiedUser,
} from './repository/auth.cache.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { comparePassword, hashPassword } from '@/common/helpers';
import type { SignUpInput } from './dto/sign-up.dto';
import { OtpService } from '../otp/otp.service';
import { VerifyOtpInput } from './dto/verify-otp.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginInput } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/strategies/jwt.strategy';
import { ForgotPasswordInput } from './dto/forgot-password.dto';
import { SafeUser } from '@/common/types/safe-user.type';

export type ResetPasswordTokenPayload = {
  sub: string; // userId
  nonce: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
    private readonly userRepo: UserRepository,
    private readonly contactStrategyFactory: ContactStrategyFactory,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpInput) {
    const strategy = this.contactStrategyFactory.resolve(
      signUpDto.identifierType,
    );

    const existingUser = await strategy.findExistingUser(signUpDto);
    if (existingUser) {
      throw new BadRequestException(
        'Already have an account with this identifier, please login instead',
      );
    }

    const identifier = strategy.getIdentifier(signUpDto);

    const unverifiedUser = {
      name: signUpDto.name,
      ...strategy.buildContactFields(signUpDto),
      passwordHash: await hashPassword(signUpDto.password),
      createdAt: new Date(),

      //? We need this to know which strategy to use when resending OTP or verifying from cache
      identifierType: signUpDto.identifierType,
    } satisfies UnverifiedUser;

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    await this.sendOtp(unverifiedUser);

    return { message: 'Verification sent', data: { identifier } };
  }

  async verifyOtp(dto: VerifyOtpInput) {
    const strategy = this.contactStrategyFactory.resolve(dto.identifierType);

    const identifier = strategy.getIdentifier(dto);

    const isValid = this.otpService.verify(dto.otp, identifier);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    switch (dto.verifyReason) {
      case 'register': {
        return this.verifyOtpForRegistration(identifier);
      }
      case 'forgot-password': {
        const user = await strategy.findExistingUser(dto);

        if (!user) {
          throw new UnauthorizedException(
            'Invalid credentials, user not found',
          );
        }

        return this.verifyOtpForPasswordReset(user);
      }
      default:
        //? This should never happen because of the DTO validation, but we add this to satisfy TypeScript exhaustiveness check
        throw new BadRequestException('Invalid verification reason');
    }
  }

  private async verifyOtpForRegistration(identifier: string) {
    const unverifiedUser =
      await this.authCacheRepo.getUnverifiedUser(identifier);

    if (!unverifiedUser) {
      throw new BadRequestException('Session expired, please sign up again');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { identifierType, ...userData } = unverifiedUser;

    await this.userRepo.create(userData);

    await this.authCacheRepo.deleteUnverifiedUser(identifier);

    return { message: 'Account verified successfully' };
  }

  private async verifyOtpForPasswordReset(user: SafeUser) {
    const nonce = await this.authCacheRepo.getResetPasswordNonce(user.id);

    if (!nonce) {
      throw new BadRequestException(
        'Session expired, please initiate forgot password again',
      );
    }

    //! dont delete nonce from cache here, we will delete it after password reset to prevent multiple OTP verifications and ensure that the user resets the password immediately after verifying OTP

    const token = this.jwtService.sign({
      sub: user.id,
      nonce,
    } satisfies ResetPasswordTokenPayload);

    return {
      message: 'OTP verified, you can now reset your password',
      data: { token },
    };
  }

  private async sendOtp(user: UnverifiedUser) {
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

    return {
      message: 'Verification resent',
      data: { identifier: dto.identifier },
    };
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    return {
      message: 'Login successful',
      data: {
        token,
        user: safeUser,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordInput) {
    const strategy = this.contactStrategyFactory.resolve(dto.identifierType);

    const user = await strategy.findExistingUser(dto);

    if (!user) {
      throw new BadRequestException('User not found with this identifier');
    }

    const identifier = strategy.getIdentifier(dto);

    const nonce = await this.authCacheRepo.saveResetPasswordNonce(user.id);

    const otp = this.otpService.generate(nonce);

    await strategy.sendPasswordReset(user, otp);

    return {
      message: 'Password reset OTP sent',
      data: { identifier },
    };
  }
}
