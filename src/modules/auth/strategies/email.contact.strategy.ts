import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, MailJobs } from '@/common/mail/mail.constants';
import { WelcomeJobData } from '@/common/mail/mail.processor';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowSignUpInput,
} from './contact.strategy.interface';

type EmailInput = NarrowSignUpInput<'email'>;

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

  buildContactFields(dto: EmailInput) {
    return { email: dto.email };
  }

  async findExistingUser(dto: EmailInput) {
    return this.userRepo.findByEmail(dto.email);
  }

  async sendVerification(dto: EmailInput, otp: string): Promise<void> {
    await this.mailQueue.add(
      MailJobs.WELCOME,
      {
        email: dto.email,
        name: dto.name,
        otp: otp,
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
