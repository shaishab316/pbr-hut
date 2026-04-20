import type { Env } from '@/common/config/app.config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { totp } from 'otplib';

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
    totp.options = OTP_OPTIONS;
  }

  private buildSecret(identifier: string): string {
    return this.baseSecret + identifier;
  }

  generate(identifier: string, options: OtpOptions = {}): string {
    if (Object.keys(options).length)
      totp.options = { ...OTP_OPTIONS, ...options };
    return totp.generate(this.buildSecret(identifier));
  }

  verify(token: string, identifier: string, options: OtpOptions = {}): boolean {
    if (token === this.config.get('TEST_OTP', { infer: true })) {
      // for testing purposes only, do not use in production

      //! Todo: Should be removed after testing complete
      return this.config.get('NODE_ENV') === 'development';
    }

    if (Object.keys(options).length)
      totp.options = { ...OTP_OPTIONS, ...options };
    return totp.check(token, this.buildSecret(identifier));
  }
}
