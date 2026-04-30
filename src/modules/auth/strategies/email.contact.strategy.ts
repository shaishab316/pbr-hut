import { Injectable } from '@nestjs/common';
import { SafeUser } from '@/common/types/safe-user.type';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowLoginInput,
} from './contact.strategy.interface';
import type {
  UnverifiedRider,
  UnverifiedUser,
} from '../repository/auth.cache.repository';
import { MailService } from '@/infra/mail/mail.service';

type EmailInput = NarrowLoginInput<'email'>;

@Injectable()
export class EmailContactStrategy implements IContactStrategy<'email'> {
  readonly identifierType = 'email' as const;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly mailService: MailService,
  ) {}

  getIdentifier(dto: EmailInput): string {
    return dto.email;
  }

  getIdentifierFromCache<T extends UnverifiedUser | UnverifiedRider>(user: T) {
    return user.email!;
  }

  buildContactFields(dto: EmailInput) {
    return { email: dto.email };
  }

  async findExistingUser(dto: EmailInput) {
    return this.userRepo.findByEmail(dto.email);
  }

  async findExistingUserWithPassword(dto: EmailInput) {
    return this.userRepo.findByEmailWithPassword(dto.email);
  }

  async sendVerification<T extends UnverifiedUser | UnverifiedRider>(
    user: T,
    otp: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      email: user.email!,
      subject: "Welcome to PBR Hut! Here's your verification code",
      body: `Hi ${user.name},\n\nThank you for signing up for PBR Hut! Your verification code is: ${otp}\n\nPlease enter this code in the app to verify your email address and complete your registration.\n\nIf you did not sign up for PBR Hut, please ignore this email.\n\nBest regards,\nThe PBR Hut Team`,
    });
  }

  async sendPasswordReset(user: SafeUser, otp: string): Promise<void> {
    await this.mailService.sendMail({
      email: user.email!,
      subject: 'PBR Hut Password Reset Request',
      body: `Hi ${user.name},\n\nWe received a request to reset your password for your PBR Hut account. Your password reset code is: ${otp}\n\nPlease enter this code in the app to reset your password.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe PBR Hut Team`,
    });
  }
}
