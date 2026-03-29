import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuthCacheRepository,
  type UnverifiedUser,
} from './repository/auth.cache.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { hashPassword } from '@/common/helpers';
import type { SignUpInput } from './dto/sign-up.dto';
import { OtpService } from '../otp/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginInput } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
    private readonly userRepo: UserRepository,
    private readonly contactStrategyFactory: ContactStrategyFactory,
    private readonly otpService: OtpService,
  ) {}

  async signUp(signUpDto: SignUpInput) {
    const strategy = this.contactStrategyFactory.resolve(signUpDto.contactType);

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
      contactType: signUpDto.contactType,
    } satisfies UnverifiedUser;

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    await this.sendOtp(unverifiedUser);

    return { message: 'Verification sent', identifier };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const isValid = this.otpService.verify(dto.otp, dto.identifier);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const unverifiedUser = await this.authCacheRepo.getUnverifiedUser(
      dto.identifier,
    );
    if (!unverifiedUser) {
      throw new BadRequestException('Session expired, please sign up again');
    }

    await this.userRepo.create(unverifiedUser);

    await this.authCacheRepo.deleteUnverifiedUser(dto.identifier);

    return { message: 'Account verified successfully' };
  }

  private async sendOtp(user: UnverifiedUser) {
    const strategy = this.contactStrategyFactory.resolve(user.contactType);

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

    return { message: 'Verification resent' };
  }

  async login(loginDto: LoginInput) {
    const strategy = this.contactStrategyFactory.resolve(loginDto.contactType);

    const user = await strategy.findExistingUser(loginDto);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
  }
}
