# Redis Caching Layer

Redis provides fast, in-memory caching for frequently accessed data, reducing database load and improving response times.

## Cache Keys

```
menu:categories                 # All categories
menu:items:{restaurantId}      # Restaurant's items
restaurant:{id}                 # Restaurant metadata
user:profile:{userId}          # User profile
order:{orderId}                 # Order details
```

## TTLs

| Data | TTL | Reason |
|------|-----|--------|
| Menu items | 30 min | Changes infrequently |
| Categories | 1 hour | Rarely changes |
| Restaurant | 2 hours | Update when admin changes |
| User profile | 5 min | Fresh per session |

## Implementation

```typescript
@Injectable()
export class RedisService {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }
}
```

## Caching Strategy

```typescript
@Get('items/:id')
@UseGuards(JwtGuard)
async getItem(@Param('id') id: string): Promise<Item> {
  const cacheKey = `menu:items:${id}`;
  
  // Check cache
  const cached = await this.redisService.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - query database
  const item = await this.itemRepository.findById(id);
  
  // Store in cache
  await this.redisService.set(
    cacheKey,
    JSON.stringify(item),
    1800  // 30 minutes
  );

  return item;
}
```

## Cache Invalidation

```typescript
@Post('items')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
async createItem(@Body() dto: CreateItemDto) {
  const item = await this.itemRepository.create(dto);

  // Invalidate relevant caches
  await this.redisService.delete(`menu:items:${dto.restaurantId}`);
  await this.redisService.delete('menu:categories');

  return item;
}
```

## Patterns

### Cache-Aside

```typescript
// 1. Check cache
// 2. If miss, query DB
// 3. Update cache
```

### Write-Through

```typescript
// 1. Write to DB
// 2. Update cache
// 3. Return to client
```

### Cache Warming

```typescript
@Cron('0 * * * *')  // Every hour
async warmMenuCache(): Promise<void> {
  const restaurants = await this.restaurantRepository.findAll();
  
  for (const restaurant of restaurants) {
    const items = await this.itemRepository.findByRestaurant(restaurant.id);
    await this.redisService.set(
      `menu:items:${restaurant.id}`,
      JSON.stringify(items),
      3600
    );
  }
}
```

## Response Headers

```
X-Cache: HIT           # From Redis
X-Cache: MISS          # From DB
X-Cache-TTL: 1800     # Seconds until expiration
```

## Connection

```env
REDIS_URL=redis://localhost:6379
# or
REDIS_URL=redis://:password@host:port
```

## Best Practices

1. **Short TTLs** - 30 min or less for menu
2. **Invalidate aggressively** - Don't serve stale data
3. **Use structured keys** - `resource:type:id`
4. **Handle cache misses** - DB fallback
5. **Monitor hits/misses** - Track cache effectiveness
6. **Compress large values** - If > 1MB
7. **Set max memory** - Prevent disk swaps
