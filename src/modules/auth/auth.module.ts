import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '@/common/config/app.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCron } from './auth.cron';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { EmailContactStrategy } from './strategies/email.contact.strategy';
import { PhoneContactStrategy } from './strategies/phone.contact.strategy';
import {
  CONTACT_STRATEGIES,
  type IContactStrategy,
} from './strategies/contact.strategy.interface';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';
import { OtpModule } from '../otp/otp.module';
import { RiderModule } from '../rider/rider.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }), // e.g '7d'
        },
      }),
    }),
    UserModule,
    RiderModule,
    OtpModule,
  ],
  providers: [
    AuthService,
    AuthCron,
    JwtStrategy,
    AuthCacheRepository,
    RefreshTokenRepository,
    EmailContactStrategy,
    PhoneContactStrategy,
    {
      provide: CONTACT_STRATEGIES,
      useFactory: (
        email: EmailContactStrategy,
        phone: PhoneContactStrategy,
      ): IContactStrategy[] => [email, phone],
      inject: [EmailContactStrategy, PhoneContactStrategy],
    },
    ContactStrategyFactory,
  ],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
