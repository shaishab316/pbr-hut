import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { hashPassword } from '@/common/helpers';
import type { SignUpInput } from './dto/sign-up.dto';
import { OtpService } from '../otp/otp.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
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
      password: await hashPassword(signUpDto.password),
      createdAt: new Date(),
    };

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    const otp = await this.otpService.generate(identifier);
    await strategy.sendVerification(signUpDto, otp);

    return { message: 'Verification sent', identifier };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const isValid = await this.otpService.verify(dto.otp, dto.identifier);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const unverifiedUser = await this.authCacheRepo.getUnverifiedUser(
      dto.identifier,
    );
    if (!unverifiedUser) {
      throw new BadRequestException('Session expired, please sign up again');
    }

    // TODO: userRepo.create(unverifiedUser)

    await this.authCacheRepo.deleteUnverifiedUser(dto.identifier);

    return { message: 'Account verified successfully' };
  }
}
