# Multi-File Prisma Schema Design

PBR Hut uses a multi-file Prisma schema split across `prisma/schema/` for maintainability, readability, and avoiding a monolithic schema file.

## Directory Structure

```
prisma/
├── schema/
│   ├── schema.prisma          # Root file (generators, datasource)
│   ├── enum.prisma            # All enums
│   ├── user.prisma            # User model
│   ├── rider-profile.prisma   # Rider-related models
│   ├── item.prisma            # Item, Size, Extra models
│   ├── cart.prisma            # Cart models
│   ├── order.prisma           # Order models
│   ├── restaurant.prisma      # Restaurant model
│   ├── earning.prisma         # RiderEarning model
│   └── ads.prisma             # Ads models
└── migrations/
    ├── migration_lock.toml
    └── [timestamp]_[name]/
        └── migration.sql
```

## Root Schema File

```prisma
// prisma/schema/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Import all models
import "./enum.prisma"
import "./user.prisma"
import "./rider-profile.prisma"
import "./item.prisma"
import "./cart.prisma"
import "./order.prisma"
import "./restaurant.prisma"
import "./earning.prisma"
import "./ads.prisma"
```

## Enum File

```prisma
// prisma/schema/enum.prisma

enum UserRole {
  CUSTOMER
  RIDER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
}

enum ItemSize {
  SMALL
  MEDIUM
  LARGE
  EXTRA_LARGE
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum DeliveryType {
  DELIVERY
  PICKUP
}
```

## User Model

```prisma
// prisma/schema/user.prisma

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  phone     String?  @unique
  firstName String
  lastName  String
  password  String
  role      UserRole @default(CUSTOMER)
  isActive  Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  orders     Order[]
  cartItems  CartItem[]
  addresses  Address[]
}
```

## Item Model with Relationships

```prisma
// prisma/schema/item.prisma

model Item {
  id              String   @id @default(cuid())
  name            String
  description     String?
  priceInCents    Int
  restaurantId    String
  categoryId      String
  imageUrl        String?
  isAvailable     Boolean  @default(true)
  isSoftDeleted   Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])
  category        Category   @relation(fields: [categoryId], references: [id])
  sizes           Size[]
  sideOptions     SideOption[]
  extras          Extra[]
  cartItems       CartItem[]
  orderItems      OrderItem[]
  tags            ItemTag[]
}

model Size {
  id          String @id @default(cuid())
  itemId      String
  name        String
  priceInCents Int
  
  item        Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  cartItems   CartItem[]
}

model SideOption {
  id          String @id @default(cuid())
  itemId      String
  name        String
  priceInCents Int
  
  item        Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  orderItems  OrderItemExtra[]
}

model Extra {
  id          String @id @default(cuid())
  itemId      String
  name        String
  priceInCents Int
  
  item        Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  orderItems  OrderItemExtra[]
}
```

## Order Model

```prisma
// prisma/schema/order.prisma

model Order {
  id                String       @id @default(cuid())
  customerId        String
  riderId           String?
  restaurantId      String
  status            OrderStatus  @default(PENDING)
  deliveryType      DeliveryType
  totalInCents      Int
  taxInCents        Int
  discountInCents   Int
  deliveryFeeInCents Int
  
  billingAddress    Address?
  shippingAddress   Address?
  
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  // Relations
  customer          User         @relation(fields: [customerId], references: [id])
  items             OrderItem[]
  payment           Payment?
}

model OrderItem {
  id              String @id @default(cuid())
  orderId         String
  itemId          String
  itemName        String  // Snapshot
  itemPrice       Int     // Snapshot
  quantity        Int
  sizeId          String?
  sizeName        String?
  sizePrice       Int?
  
  order           Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  item            Item    @relation(fields: [itemId], references: [id])
  extras          OrderItemExtra[]
}

model OrderItemExtra {
  id            String @id @default(cuid())
  orderItemId   String
  extraId       String
  extraName     String    // Snapshot
  extraPrice    Int
  
  orderItem     OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  extra         Extra     @relation(fields: [extraId], references: [id])
}
```

## Indexing Strategy

```prisma
model Order {
  id              String @id
  customerId      String
  createdAt       DateTime
  
  // Indexes for common queries
  @@index([customerId, createdAt])      // Customer's orders by date
  @@index([riderId, status])            // Rider's active orders
  @@index([status, createdAt])          // Orders by status
}

model Item {
  id              String @id
  restaurantId    String
  categoryId      String
  isSoftDeleted   Boolean
  
  // Indexes for queries
  @@index([restaurantId, isSoftDeleted]) // Restaurant's items
  @@index([categoryId])                  // Items by category
}
```

## Benefits of Multi-File Schema

1. **Readability**: Each file focuses on one domain
2. **Maintainability**: Easier to find and update models
3. **Collaboration**: Multiple devs can work on different files
4. **Testing**: Can generate schema subsets for tests
5. **Organization**: Mirrors module structure in `src/`

## Generating Client

After schema changes, regenerate the Prisma client:

```bash
pnpm run prisma:generate
```

Or manually:

```bash
npx prisma generate --schema prisma/schema/schema.prisma
```

## Migration Workflow

Migrations are created based on the full schema:

```bash
# Create a migration
pnpm run prisma:migrate

# Apply pending migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Relationships

### One-to-Many
```prisma
model Restaurant {
  id    String @id
  items Item[]  // One restaurant has many items
}

model Item {
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
}
```

### Many-to-Many
```prisma
model Item {
  tags ItemTag[]
}

model Tag {
  items ItemTag[]
}

model ItemTag {
  itemId String
  tagId  String
  item   Item   @relation(fields: [itemId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])
  
  @@id([itemId, tagId])
}
```

### One-to-One
```prisma
model User {
  profile RiderProfile?  // Optional
}

model RiderProfile {
  userId  String  @unique
  user    User    @relation(fields: [userId], references: [id])
}
```

## Best Practices

1. **Name files after domain** (item, order, user)
2. **Use `@@index`** for frequently queried fields
3. **Use `onDelete: Cascade`** for dependent records
4. **Use soft deletes** for audit trails
5. **Create snapshots** for immutable data (orders)
6. **Use `@unique`** for email, phone identifiers
