# Redis Caching Layer

Redis provides fast, in-memory caching for frequently accessed data, reducing database load and improving response times.

## Current Setup

The caching layer uses a **decorator-based approach** with automatic cache interceptor handling:

- `@CacheKey(key)` - Defines the cache key template
- `@CacheTTL(seconds)` - Sets the time-to-live for cached data
- `@InvalidateCache(...keys)` - Invalidates cache keys after request execution
- `CacheInterceptor` - Handles cache logic automatically

## Cache Key Templates

Cache keys support dynamic template resolution using the format `:source.field`:

```
user:me::user.id           # Resolves to: user:me::{userId}
order::params.id           # Resolves to: order::{orderId}
restaurant::body.id        # Resolves to: restaurant::{restaurantId}
menu:items::params.restaurantId  # Resolves to: menu:items::{restaurantId}
```

### Supported Sources

| Source | Description | Example |
|--------|-------------|---------|
| `user.*` | Current authenticated user | `user.id`, `user.email` |
| `params.*` | URL parameters | `params.id`, `params.restaurantId` |
| `body.*` | Request body fields | `body.userId`, `body.orderId` |

## Implementation Example

```typescript
@Get('me')
@CacheKey('user:me::user.id')
@CacheTTL(300)  // 5 minutes
async getMe(@CurrentUser('id') userId: string) {
  const user = await this.userService.getMe(userId);
  return {
    message: `Welcome back, ${user.name}!`,
    data: user,
  };
}

@Patch('update-profile')
@UseInterceptors(ProfilePictureUploadInterceptor)
@InvalidateCache('user:me::user.id')  // Invalidate on write
async updateProfile(
  @CurrentUser('id') userId: string,
  @UploadedFiles() files: any,
  @Body() body: any,
) {
  // ... update logic
  return updatedUser;
}
```

## Cache Interceptor

The `CacheInterceptor` automatically handles:

1. **Cache Retrieval** - Checks cache before executing handler
2. **Cache Storage** - Stores response in cache after execution
3. **Cache Invalidation** - Deletes cache keys by pattern after mutation
4. **Query Parameters** - Appends sorted query params to cache key
5. **Response Headers** - Sets `X-Cache: HIT/MISS` headers

```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 1. Check for invalidation metadata
    // 2. Check for cache key metadata
    // 3. Resolve cache key from template
    // 4. Append sorted query parameters
    // 5. Retrieve from cache (return if HIT)
    // 6. Execute handler on MISS
    // 7. Store response in cache
    // 8. Return response
  }
}
```

## Usage Patterns

### Read Operations (GET)

```typescript
@Get('items/:id')
@CacheKey('menu:items::params.id')
@CacheTTL(1800)  // 30 minutes
async getItem(@Param('id') id: string) {
  return this.itemService.findById(id);
}
```

### Write Operations (POST, PATCH, PUT)

```typescript
@Post('items')
@InvalidateCache('menu:items', 'menu:categories')
async createItem(@Body() dto: CreateItemDto) {
  return this.itemService.create(dto);
}
```

### Automatic Query Parameter Handling

```typescript
@Get('items')
@CacheKey('menu:items')
@CacheTTL(600)  // 10 minutes
async getItems(@Query() filters: any) {
  // Cache key automatically becomes:
  // menu:items:filter=active&limit=10&sort=name
  return this.itemService.search(filters);
}
```

## Response Headers

The interceptor automatically sets cache status headers:

```
X-Cache: HIT           # Response served from cache
X-Cache: MISS          # Response fetched from database
```

## TTL Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 300s (5min) | Frequent updates |
| Menu items | 1800s (30min) | Changes infrequently |
| Categories | 3600s (1hr) | Rarely changes |
| Orders | 600s (10min) | Status updates |
| Restaurant | 7200s (2hrs) | Admin updates only |

## Connection

```env
REDIS_URL=redis://localhost:6379
# or with authentication
REDIS_URL=redis://:password@host:port/db
```

## Best Practices

1. **Use Template-Based Keys** - Always use `@CacheKey('resource:type::source.field')` format
2. **Set Appropriate TTLs** - Lower TTLs for frequently changing data (user profile: 5min, items: 30min)
3. **Invalidate on Write** - Use `@InvalidateCache()` on POST, PATCH, PUT operations
4. **Batch Invalidations** - Invalidate related cache keys together: `@InvalidateCache('menu:items', 'menu:categories')`
5. **Leverage Query Params** - Interceptor automatically includes sorted query params in cache key
6. **Test Cache Headers** - Check `X-Cache: HIT/MISS` headers during development
7. **Monitor Performance** - Log cache hits/misses using the built-in logger
8. **Handle Errors Gracefully** - Interceptor catches Redis errors and falls back to database
