/* eslint-disable @typescript-eslint/require-await */
import { RedisService } from '@/modules/redis/redis.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthCacheRepository {
  constructor(private readonly redis: RedisService) {}

  async saveUnverifiedUser(
    identifier: string,
    userData: {
      name: string;
      email?: string;
      phone?: string;
      password: string;
      createdAt: Date;
    },
  ) {
    return this.redis.setex(
      `unverified:${identifier}`,
      900, //? 15 minutes
      JSON.stringify(userData),
    );
  }

  async getUnverifiedUser(identifier: string) {
    const data = await this.redis.get(`unverified:${identifier}`);
    return data ? JSON.parse(data) : null;
  }
}
