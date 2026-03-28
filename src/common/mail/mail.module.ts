import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE } from './mail.constants';
import type { Env } from '../../config/app.config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transport: {
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          auth: {
            user: config.get('SMTP_USER', { infer: true }),
            pass: config.get('SMTP_PASSWORD', { infer: true }),
          },
        },
        defaults: {
          from: `"${config.get('SMTP_FROM_NAME', { infer: true })}" <${config.get('SMTP_FROM_EMAIL', { infer: true })}>`,
        },
      }),
    }),

    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  providers: [MailProcessor],
  exports: [BullModule],
})
export class MailModule {}
