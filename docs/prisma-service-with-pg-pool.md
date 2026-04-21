# Prisma Service with PG Pool

The PrismaService wraps Prisma Client with pg adapter for production-grade connection pooling and lifecycle management.

## Overview

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## Connection Pooling

Uses `@prisma/adapter-pg` for efficient connection management:

```typescript
const pool = new Pool({
  max: 20,              // Maximum connections
  min: 2,               // Minimum idle connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

## Configuration

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
```

## Usage

```typescript
@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data,
    });
  }
}
```

## Connection Monitoring

Monitor pool health:

```typescript
// Get pool stats
const stats = pool.totalCount;      // Total connections
const idleCount = pool.idleCount;   // Idle connections
const waitingCount = pool.waitingCount; // Waiting requests
```

## Query Performance

Efficient queries using Prisma:

```typescript
// ✅ Good - Select only needed fields
await prisma.user.findUnique({
  where: { id: 'user_1' },
  select: { id: true, email: true, name: true }
});

// ❌ Avoid - Fetch all fields if not needed
await prisma.user.findUnique({
  where: { id: 'user_1' }
});

// ✅ Good - Eager loading
await prisma.order.findMany({
  include: { items: true, payment: true }
});

// ❌ Avoid - N+1 queries
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id }
  });
}
```

## Error Handling

```typescript
try {
  await prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new ConflictException('Email already exists');
  }
  if (error.code === 'P2025') {
    // Record not found
    throw new NotFoundException('User not found');
  }
  throw error;
}
```

## Transaction Support

```typescript
await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.cart.delete({ where: { id: cartId } }),
  prisma.inventory.update({ where, data })
]);
```

## Best Practices

1. **Select specific fields** - Reduce payload size
2. **Use transactions** - For atomic operations
3. **Index frequently queried fields** - Improve query speed
4. **Monitor connection pool** - Avoid exhaustion
5. **Use connection pooling** - Share connections
6. **Handle errors gracefully** - Catch Prisma errors

## Migrations

```bash
# Create migration
pnpm run prisma:migrate

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Studio

Visual database browser:

```bash
pnpm run prisma:studio
```

Opens at `http://localhost:5555`
