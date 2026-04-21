import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheInterceptor } from '@/common/interceptors/cache.interceptor';
import { Reflector } from '@nestjs/core';

@Global()
@Module({
  providers: [RedisService, CacheInterceptor, Reflector],
  exports: [RedisService, CacheInterceptor],
})
export class RedisModule {}
