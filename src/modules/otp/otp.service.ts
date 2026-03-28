import type { Env } from '@/config/app.config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { generate, verify } from 'otplib';

const OTP_OPTIONS = {
  digits: 6,
  step: 300, // 5 min
  window: 1,
} as const;

type OtpOptions = Partial<typeof OTP_OPTIONS>;

@Injectable()
export class OtpService {
  private readonly baseSecret: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.baseSecret = this.config.get('OTP_SECRET', { infer: true });
  }

  private buildSecret(identifier: string): string {
    return createHmac('sha256', this.baseSecret)
      .update(identifier)
      .digest('base64url')
      .toUpperCase()
      .replace(/[^A-Z2-7]/g, '');
  }

  async generate(
    identifier: string,
    options: OtpOptions = {},
  ): Promise<string> {
    return generate({
      secret: this.buildSecret(identifier),
      ...OTP_OPTIONS,
      ...options,
    });
  }

  async verify(
    token: string,
    identifier: string,
    options: OtpOptions = {},
  ): Promise<boolean> {
    const result = await verify({
      token,
      secret: this.buildSecret(identifier),
      ...OTP_OPTIONS,
      ...options,
    });
    return result.valid;
  }
}
