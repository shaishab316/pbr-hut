import type { Env } from '@/config/app.config';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_KEY } from './redis.constant';

type Ctx = typeof CACHE_KEY;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService<Env, true>) {}

  onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });

    // If Redis drops, this prevents the Node event loop from hanging forever.
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000), // Exponential backoff maxing at 3s
    });

    this.client.on('error', (err) =>
      this.logger.error(`Redis connection error: ${err.message}`),
    );

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from Redis...');

    // Sometimes .quit() hangs if the connection is completely dead.
    // This races the quit command against a 2-second timeout, then forces a disconnect.
    try {
      await Promise.race([
        this.client.quit(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } finally {
      this.client.disconnect();
    }
  }

  async get<T = unknown>(keyFn: (ctx: Ctx) => string): Promise<T | null> {
    const value = await this.client.get(keyFn(CACHE_KEY));

    if (!value) return null;

    // JSON.parse() is expensive and throws errors on standard strings.
    // We do a fast check to see if it even looks like JSON before parsing.
    const looksLikeJson =
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'));

    if (looksLikeJson) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }

    return value as unknown as T;
  }

  async set(
    keyFn: (ctx: Ctx) => string,
    value: unknown,
    expireInSeconds?: number,
  ): Promise<void> {
    const key = keyFn(CACHE_KEY);
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    if (expireInSeconds) {
      await this.client.set(key, data, 'EX', expireInSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  async del(keyFn: (ctx: Ctx) => string): Promise<void> {
    await this.client.del(keyFn(CACHE_KEY));
  }

  async exists(keyFn: (ctx: Ctx) => string): Promise<boolean> {
    return (await this.client.exists(keyFn(CACHE_KEY))) > 0;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    const stream = this.client.scanStream({
      match: pattern,
      count: 100, // Fetch keys in chunks of 100
    });

    // The 'for await' loop naturally waits for the promise in the body to resolve
    // before pulling the next chunk of data from the stream.
    for await (const chunk of stream) {
      const keys = chunk as string[];

      if (keys.length > 0) {
        // Use a pipeline to send all delete commands to Redis in one single network trip
        const pipeline = this.client.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();

        deletedCount += keys.length;
      }
    }

    return deletedCount;
  }

  async flushDb(): Promise<void> {
    // Usually only used in E2E tests.
    await this.client.flushdb();
  }

  getClient() {
    return this.client;
  }
}
