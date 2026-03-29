import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { MAIL_QUEUE } from './mail.constants';

export interface SendMailData {
  email: string;
  subject: string;
  body: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private logger = new Logger(MailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<SendMailData>) {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      html: job.data.body,
    });
  }
}
