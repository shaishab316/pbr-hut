import { RedisService } from '@/modules/redis/redis.service';
import { Injectable } from '@nestjs/common';

export type UnverifiedUser = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  createdAt: Date;
};

@Injectable()
export class AuthCacheRepository {
  constructor(private readonly redis: RedisService) {}

  async saveUnverifiedUser(identifier: string, userData: UnverifiedUser) {
    return this.redis.setex(
      `unverified:${identifier}`,
      900, //? 15 minutes
      JSON.stringify(userData),
    );
  }

  async getUnverifiedUser(identifier: string): Promise<UnverifiedUser | null> {
    const data = await this.redis.get(`unverified:${identifier}`);

    if (!data) return null;

    try {
      return JSON.parse(data) as UnverifiedUser;
    } catch {
      //? Delete corrupted cache entry
      await this.redis.del(`unverified:${identifier}`);
      return null;
    }
  }

  async deleteUnverifiedUser(identifier: string): Promise<void> {
    await this.redis.del(`unverified:${identifier}`);
  }
}
