# AuthCacheRepository

A typed, Redis-backed cache repository for managing transient authentication data. Provides a single source of truth for cache keys, TTLs, and CRUD operations on short-lived auth artifacts.

## Overview

The `AuthCacheRepository` is a small but intentional abstraction layer over Redis for auth-related transient data. It enforces:

- **Centralized key management**: All Redis keys defined in one place
- **Type safety**: Explicit TypeScript types for all reads/writes
- **Consistent naming**: `create`, `get`, `delete` semantics
- **TTL management**: All TTLs centralized for easy auditing and changes
- **Zero key duplication**: Lambdas stored as fields to avoid re-allocation

## Key Features

### TTL Configuration

All TTLs are centralized in the `TTL_SECONDS` constant (in seconds, compatible with Redis EX):

```typescript
const TTL_SECONDS = {
  UNVERIFIED_USER: 15 * 60,          // 15 minutes
  PASSWORD_RESET_NONCE: 10 * 60,     // 10 minutes
} as const;
```

To adjust expiration times, modify only this object. Changes automatically propagate to all cache operations.

### Type Definitions

The repository exports explicit types for type-safe reads/writes:

#### `SignupData`
Union type for signup input fields (name, email, phone, passwordHash, createdAt, identifierType).

#### `UnverifiedUser`
Signup data for a customer role:
```typescript
type UnverifiedUser = SignupData & {
  role: typeof UserRole.CUSTOMER;
};
```

#### `UnverifiedRider`
Signup data for a rider role with location:
```typescript
type UnverifiedRider = SignupData & {
  latitude: number;
  longitude: number;
  role: typeof UserRole.RIDER;
};
```

#### `UnverifiedEntity`
Union of all unverified user types:
```typescript
type UnverifiedEntity = UnverifiedUser | UnverifiedRider;
```

## API

### Unverified Signup Cache

#### `saveUnverifiedUser<T extends UnverifiedEntity>(identifier: string, data: T): Promise<void>`

Store unverified user data with automatic expiration.

**Parameters:**
- `identifier`: Email, phone, or other unique identifier
- `data`: Typed signup data (customer or rider)

**Example:**
```typescript
await authCache.saveUnverifiedUser('user@example.com', {
  name: 'John Doe',
  email: 'user@example.com',
  phone: '+1234567890',
  passwordHash: 'hashed_password',
  createdAt: new Date(),
  identifierType: 'email',
  role: UserRole.CUSTOMER,
});
```

**TTL:** 15 minutes (expires automatically)

---

#### `getUnverifiedUser<T extends UnverifiedEntity>(identifier: string): Promise<T | null>`

Retrieve unverified user data. Returns `null` if missing or expired.

**Parameters:**
- `identifier`: Email, phone, or other unique identifier

**Returns:** Typed signup data or `null`

**Example:**
```typescript
const unverified = await authCache.getUnverifiedUser<UnverifiedUser>('user@example.com');
if (unverified) {
  // Email user a verification link
}
```

---

#### `deleteUnverifiedUser(identifier: string): Promise<void>`

Explicitly remove unverified user data. Optional; TTL automatically clears expired data.

**Parameters:**
- `identifier`: Email, phone, or other unique identifier

**Use cases:**
- After successful email verification
- After user explicitly cancels signup
- Administrative cleanup

**Example:**
```typescript
await authCache.deleteUnverifiedUser('user@example.com');
```

---

### Password Reset Nonce Cache

#### `createPasswordResetNonce(userId: string): Promise<string>`

Generate and store a one-time password reset nonce.

**Parameters:**
- `userId`: Unique user identifier (UUID or similar)

**Returns:** Generated nonce (UUID v4)

**Example:**
```typescript
const nonce = await authCache.createPasswordResetNonce(userId);
// Send nonce to user via email: https://example.com/reset?nonce={nonce}
```

**TTL:** 10 minutes (expires automatically)

---

#### `getPasswordResetNonce(userId: string): Promise<string | null>`

Retrieve the password reset nonce. Returns `null` if missing or expired.

**Parameters:**
- `userId`: Unique user identifier

**Returns:** Nonce string or `null`

**Example:**
```typescript
const nonce = await authCache.getPasswordResetNonce(userId);
if (!nonce) {
  throw new BadRequestException('Reset link expired. Request a new one.');
}
// Validate nonce matches user input, then allow password change
```

---

#### `deletePasswordResetNonce(userId: string): Promise<void>`

Explicitly remove the password reset nonce. Optional; TTL automatically clears expired data.

**Parameters:**
- `userId`: Unique user identifier

**Use cases:**
- After successful password reset
- After user explicitly cancels reset
- On invalid nonce submission (security best practice)

**Example:**
```typescript
// After successfully resetting password
await authCache.deletePasswordResetNonce(userId);
```

---

## Design Patterns

### Key Selectors as Fields

Key selectors are stored as class fields to avoid re-allocating lambdas on each call:

```typescript
private unverifiedUserKey(identifier: string) {
  return (ctx: any) => ctx.AUTH.UNVERIFIED_USER(identifier);
}
```

This pattern:
- Centralizes key logic in one method
- Reduces garbage collection overhead
- Makes key naming consistent
- Simplifies future key schema changes

### Generics for Type Safety

All reads/writes support generics to maintain type safety:

```typescript
// Type-safe read
const user = await authCache.getUnverifiedUser<UnverifiedUser>(identifier);

// Type-safe write (inferred from parameter)
await authCache.saveUnverifiedUser(identifier, typedData);
```

### Consistent CRUD Naming

All operations follow a predictable naming pattern:

- `save*()` → create or update
- `get*()` → read (returns `null` if missing)
- `delete*()` → remove
- `create*()` → generate and store (e.g., nonce generation)

---

## Integration Example

Typical signup flow:

```typescript
// Step 1: User submits signup form
const signupData: UnverifiedUser = {
  name: 'Alice',
  email: 'alice@example.com',
  phone: '+1111111111',
  passwordHash: await hashPassword(password),
  createdAt: new Date(),
  identifierType: 'email',
  role: UserRole.CUSTOMER,
};

// Step 2: Cache unverified data
await authCache.saveUnverifiedUser('alice@example.com', signupData);

// Step 3: Send verification email
const verificationLink = generateVerificationLink('alice@example.com');
await emailService.send(signupData.email, verificationLink);

// Step 4: User clicks verification link
const cached = await authCache.getUnverifiedUser<UnverifiedUser>('alice@example.com');
if (!cached) {
  throw new BadRequestException('Signup expired. Please try again.');
}

// Step 5: Create user in database
await prisma.user.create({
  data: {
    name: cached.name,
    email: cached.email,
    phone: cached.phone,
    passwordHash: cached.passwordHash,
    role: cached.role,
  },
});

// Step 6: Clean up cache
await authCache.deleteUnverifiedUser('alice@example.com');
```

---

## Configuration & Maintenance

### Adjusting TTLs

To change expiration times, update `TTL_SECONDS`:

```typescript
const TTL_SECONDS = {
  UNVERIFIED_USER: 30 * 60,          // Increase to 30 minutes
  PASSWORD_RESET_NONCE: 5 * 60,      // Decrease to 5 minutes
} as const;
```

Changes apply globally to all new cache entries immediately.

### Monitoring & Debugging

When debugging cache issues:

1. **Check Redis directly**: Use `redis-cli` to inspect keys and TTLs
   ```bash
   redis-cli TTL <key>
   redis-cli GET <key>
   ```

2. **Verify key naming**: Ensure identifiers match what's cached
3. **Check TTL timing**: Confirm entries expire as expected
4. **Monitor Redis memory**: Large signup batches may consume significant memory

---

## Testing

### Unit Test Example

```typescript
describe('AuthCacheRepository', () => {
  let authCache: AuthCacheRepository;
  let redisService: RedisService;

  beforeEach(() => {
    redisService = new RedisService(/* ... */);
    authCache = new AuthCacheRepository(redisService);
  });

  it('should save and retrieve unverified user', async () => {
    const data: UnverifiedUser = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      passwordHash: 'hash',
      createdAt: new Date(),
      identifierType: 'email',
      role: UserRole.CUSTOMER,
    };

    await authCache.saveUnverifiedUser('test@example.com', data);
    const retrieved = await authCache.getUnverifiedUser<UnverifiedUser>(
      'test@example.com'
    );

    expect(retrieved).toEqual(data);
  });

  it('should return null for expired/missing entries', async () => {
    const result = await authCache.getUnverifiedUser('nonexistent@example.com');
    expect(result).toBeNull();
  });

  it('should generate unique password reset nonces', async () => {
    const nonce1 = await authCache.createPasswordResetNonce('user1');
    const nonce2 = await authCache.createPasswordResetNonce('user1');

    // Each call generates a new nonce
    expect(nonce1).not.toEqual(nonce2);
  });
});
```

---

## Dependencies

- **@nestjs/common**: Injectable decorator
- **@prisma/client**: Type definitions for database schema (UserRole, Prisma types)
- **node:crypto**: UUID v4 generation
- **RedisService**: Custom Redis abstraction (from `@/modules/redis/redis.service`)

---

## See Also

- Redis documentation: https://redis.io/docs/data-types/strings/
- NestJS Dependency Injection: https://docs.nestjs.com/providers
- Prisma types: https://www.prisma.io/docs