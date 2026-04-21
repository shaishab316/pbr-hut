import { RedisService } from '@/modules/redis/redis.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mergeMap, Observable, of } from 'rxjs';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const INVALIDATE_CACHE_METADATA = 'invalidate_cache';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const res = context.switchToHttp().getResponse();
    const req = context.switchToHttp().getRequest();
    const query = req.query as Record<string, string>;

    const sortedQuery = Object.keys(query)
      .filter((k) => query[k] !== '' && query[k] !== undefined)
      .sort()
      .map((k) => `${k}=${query[k]}`)
      .join('&');

    const invalidateKeys = this.reflector.get<string[]>(
      INVALIDATE_CACHE_METADATA,
      context.getHandler(),
    );

    if (invalidateKeys?.length) {
      return next.handle().pipe(
        mergeMap(async (data) => {
          const resolvedKeys = invalidateKeys.map((key) =>
            key.replace(/:(\w+\.\w+)/g, (_, path) => {
              const [source, field] = path.split('.');
              if (source === 'params') return req.params[field] ?? key;
              if (source === 'body') return req.body[field] ?? key;
              return key;
            }),
          );
          await Promise.all(
            resolvedKeys.map((key) =>
              this.redis.del(({ RESPONSE }) => RESPONSE(key)),
            ),
          );
          return data;
        }),
      );
    }

    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    if (!cacheKey) return next.handle();

    const resolvedCacheKey = sortedQuery
      ? `${cacheKey}:${sortedQuery}`
      : cacheKey;

    const ttl =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ??
      60;

    try {
      const cached = await this.redis.get<any>(({ RESPONSE }) =>
        RESPONSE(resolvedCacheKey),
      );

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return of(cached);
      }
    } catch {
      /* no-op */
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        res.setHeader('X-Cache', 'MISS');
        try {
          await this.redis.set(
            ({ RESPONSE }) => RESPONSE(resolvedCacheKey),
            data,
            ttl,
          );
        } catch {
          /* no-op */
        }
        return data;
      }),
    );
  }
}
