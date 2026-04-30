import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE } from './mail.constants';
import { SendMailData } from './mail.processor';

@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue) {}

  async sendMail(data: SendMailData): Promise<void> {
    await this.queue.add(MAIL_QUEUE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: { age: 15 * 60 },
    });
  }
}
