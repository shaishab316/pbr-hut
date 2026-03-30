import { RedisService } from '@/modules/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { type Prisma, UserRole } from '@prisma/client';
import type { SignUpInput } from '../dto/sign-up.dto';

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

@Injectable()
export class AuthCacheRepository {
  constructor(private readonly redis: RedisService) {}

  async saveUnverifiedUser<T extends UnverifiedUser | UnverifiedRider>(
    identifier: string,
    userData: T,
  ) {
    return this.redis.setex(
      `unverified:${identifier}`,
      900, //? 15 minutes
      JSON.stringify(userData),
    );
  }

  async getUnverifiedUser<T extends UnverifiedUser | UnverifiedRider>(
    identifier: string,
  ): Promise<T | null> {
    const data = await this.redis.get(`unverified:${identifier}`);

    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      //? Delete corrupted cache entry
      await this.redis.del(`unverified:${identifier}`);
      return null;
    }
  }

  async deleteUnverifiedUser(identifier: string): Promise<void> {
    await this.redis.del(`unverified:${identifier}`);
  }

  async saveResetPasswordNonce(userId: string): Promise<string> {
    const nonce = crypto.randomUUID();

    await this.redis.setex(`pwd-reset:${userId}`, 600, nonce); //? 10 minutes

    return nonce;
  }

  async getResetPasswordNonce(userId: string): Promise<string | null> {
    return this.redis.get(`pwd-reset:${userId}`);
  }

  async deleteResetPasswordNonce(userId: string): Promise<void> {
    await this.redis.del(`pwd-reset:${userId}`);
  }
}
