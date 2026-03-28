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
    } satisfies UnverifiedUser;

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    const otp = this.otpService.generate(identifier);
    await strategy.sendVerification(signUpDto, otp);

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
}
