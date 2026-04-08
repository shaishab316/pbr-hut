import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type Prisma, UserRole } from '@prisma/client';
import { RedisService } from '@/modules/redis/redis.service';
import type { SignUpInput } from '../dto/sign-up.dto';

const TTL_UNVERIFIED_USER = 15 * 60; // 15 minutes
const TTL_PASSWORD_RESET = 10 * 60; // 10 minutes

export type SignupData = Pick<
  Prisma.UserCreateInput,
  'name' | 'email' | 'phone' | 'passwordHash' | 'createdAt'
> & { identifierType: SignUpInput['identifierType'] };

export type UnverifiedUser = SignupData & {
  role: typeof UserRole.CUSTOMER;
};

export type UnverifiedRider = SignupData & {
  latitude: number;
  longitude: number;
  role: typeof UserRole.RIDER;
};

export type UnverifiedEntity = UnverifiedUser | UnverifiedRider;

@Injectable()
export class AuthCacheRepository {
  constructor(private readonly redis: RedisService) {}

  async saveUnverifiedUser<T extends UnverifiedEntity>(
    identifier: string,
    userData: T,
  ): Promise<void> {
    await this.redis.set(
      (ctx) => ctx.AUTH.UNVERIFIED_USER(identifier),
      userData,
      TTL_UNVERIFIED_USER,
    );
  }

  async getUnverifiedUser<T extends UnverifiedEntity>(
    identifier: string,
  ): Promise<T | null> {
    return this.redis.get<T>((ctx) => ctx.AUTH.UNVERIFIED_USER(identifier));
  }

  async deleteUnverifiedUser(identifier: string): Promise<void> {
    await this.redis.del((ctx) => ctx.AUTH.UNVERIFIED_USER(identifier));
  }

  async saveResetPasswordNonce(userId: string): Promise<string> {
    const nonce = randomUUID();

    await this.redis.set(
      (ctx) => ctx.AUTH.PASSWORD_RESET(userId),
      nonce,
      TTL_PASSWORD_RESET,
    );

    return nonce;
  }

  async getResetPasswordNonce(userId: string): Promise<string | null> {
    return this.redis.get<string>((ctx) => ctx.AUTH.PASSWORD_RESET(userId));
  }

  async deleteResetPasswordNonce(userId: string): Promise<void> {
    await this.redis.del((ctx) => ctx.AUTH.PASSWORD_RESET(userId));
  }
}
