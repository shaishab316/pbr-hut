import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, MailJobs } from '@/common/mail/mail.constants';
import { WelcomeJobData } from '@/common/mail/mail.processor';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowLoginInput,
} from './contact.strategy.interface';
import type { UnverifiedUser } from '../repository/auth.cache.repository';

type EmailInput = NarrowLoginInput<'email'>;

@Injectable()
export class EmailContactStrategy implements IContactStrategy<'email'> {
  readonly contactType = 'email' as const;

  constructor(
    private readonly userRepo: UserRepository,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
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
    await this.mailQueue.add(
      MailJobs.WELCOME,
      {
        email: user.email!,
        name: user.name!,
        otp,
      } satisfies WelcomeJobData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { age: 15 * 60 },
      },
    );
  }
}
