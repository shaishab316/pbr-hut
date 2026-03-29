import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE } from '@/common/mail/mail.constants';
import { SafeUser } from '@/common/types/safe-user.type';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowLoginInput,
} from './contact.strategy.interface';
import type { UnverifiedUser } from '../repository/auth.cache.repository';
import type { SendMailData } from '@/common/mail/mail.processor';

type EmailInput = NarrowLoginInput<'email'>;

@Injectable()
export class EmailContactStrategy implements IContactStrategy<'email'> {
  readonly identifierType = 'email' as const;

  constructor(
    private readonly userRepo: UserRepository,
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue,
  ) {}

  getIdentifier(dto: EmailInput): string {
    return dto.email;
  }

  getIdentifierFromCache(user: UnverifiedUser) {
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

  async sendVerification(user: UnverifiedUser, otp: string): Promise<void> {
    await this.queue.add(
      MAIL_QUEUE,
      {
        email: user.email!,
        subject: "Welcome to PBR Hut! Here's your verification code",
        body: `Hi ${user.name},\n\nThank you for signing up for PBR Hut! Your verification code is: ${otp}\n\nPlease enter this code in the app to verify your email address and complete your registration.\n\nIf you did not sign up for PBR Hut, please ignore this email.\n\nBest regards,\nThe PBR Hut Team`,
      } satisfies SendMailData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { age: 15 * 60 }, //? 15 minutes
      },
    );
  }

  async sendPasswordReset(user: SafeUser, otp: string): Promise<void> {
    await this.queue.add(
      MAIL_QUEUE,
      {
        email: user.email!,
        subject: 'PBR Hut Password Reset Request',
        body: `Hi ${user.name},\n\nWe received a request to reset your password for your PBR Hut account. Your password reset code is: ${otp}\n\nPlease enter this code in the app to reset your password.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe PBR Hut Team`,
      } satisfies SendMailData,
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { age: 10 * 60 }, //? 10 minutes
      },
    );
  }
}
