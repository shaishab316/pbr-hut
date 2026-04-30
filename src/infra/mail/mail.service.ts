import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_JOBS, MAIL_QUEUE } from './mail.constants';
import { SendMailData } from './mail.interface';

@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue) {}

  async sendMail(data: SendMailData): Promise<void> {
    await this.queue.add(MAIL_JOBS.SEND, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50, age: 24 * 60 * 60 },
    });
  }
}
