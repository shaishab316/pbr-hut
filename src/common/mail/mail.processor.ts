import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { MAIL_QUEUE, MailJobs } from './mail.constants';

export interface WelcomeJobData {
  email: string;
  name: string;
  otp: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private logger = new Logger(MailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case MailJobs.WELCOME:
        await this.sendWelcome(job.data as WelcomeJobData);
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  private async sendWelcome({ email, name, otp }: WelcomeJobData) {
    await this.mailer.sendMail({
      to: email,
      subject: 'Welcome!',
      text: `Hello, ${name}. Welcome to PBR Hut App! Your OTP is: ${otp}`,
    });
    this.logger.log(`Welcome email sent to ${email}`);
  }
}
