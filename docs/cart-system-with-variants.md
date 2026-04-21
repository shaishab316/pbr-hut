# Cart System with Variants

The cart system maintains a server-side source of truth for orders before payment. Customers select items with variants (sizes, options, extras) and the server validates and prices everything.

## Server-Side Cart

```typescript
interface CartItem {
  id: string;
  cartId: string;
  itemId: string;
  quantity: number;
  sizeId?: string;
  sideOptionIds: string[];
  extraIds: string[];
  pricePerUnit: number;  // Calculated at add time
}

interface Cart {
  id: string;
  userId: string;
  restaurantId: string;
  totalInCents: number;
  taxInCents: number;
  items: CartItem[];
  createdAt: Date;
  expiresAt: Date;  // 30 minutes
}
```

## Endpoints

### Get Cart

```bash
GET /api/v1/cart
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cart_1",
    "totalInCents": 2050,
    "taxInCents": 150,
    "items": [
      {
        "id": "item_1",
        "itemName": "Burger",
        "quantity": 2,
        "size": "Large",
        "extras": ["Bacon", "Cheese"],
        "pricePerUnit": 600,
        "subtotal": 1200
      }
    ]
  }
}
```

### Add to Cart

```bash
POST /api/v1/cart/items
Authorization: Bearer <token>

{
  "itemId": "item_1",
  "quantity": 2,
  "sizeId": "size_2",
  "sideOptionIds": [],
  "extraIds": ["extra_1", "extra_2"]
}
```

### Update Cart Item

```bash
PATCH /api/v1/cart/items/item_1

{
  "quantity": 3,
  "sizeId": "size_1",
  "extraIds": ["extra_1"]
}
```

### Remove from Cart

```bash
DELETE /api/v1/cart/items/item_1
```

### Clear Cart

```bash
DELETE /api/v1/cart
```

## Pricing Logic

```typescript
async calculatePrice(dto: AddToCartDto): Promise<number> {
  // Get base item price
  const item = await this.itemRepository.findById(dto.itemId);
  let total = item.priceInCents * dto.quantity;

  // Add size price
  if (dto.sizeId) {
    const size = await this.sizeRepository.findById(dto.sizeId);
    total += size.priceInCents * dto.quantity;
  }

  // Add extras price
  for (const extraId of dto.extraIds) {
    const extra = await this.extraRepository.findById(extraId);
    total += extra.priceInCents * dto.quantity;
  }

  // Add tax
  const taxRate = 0.05;  // 5%
  const tax = Math.floor(total * taxRate);
  return total + tax;
}
```

## Validation

```typescript
async addItem(userId: string, dto: AddToCartDto): Promise<void> {
  // Get cart
  let cart = await this.cartRepository.findByUserId(userId);
  if (!cart) {
    cart = await this.cartRepository.create({ userId });
  }

  // Validate item exists and is available
  const item = await this.itemRepository.findById(dto.itemId);
  if (!item || !item.isAvailable) {
    throw new NotFoundException('Item not available');
  }

  // Validate size if provided
  if (dto.sizeId) {
    const size = await this.sizeRepository.findById(dto.sizeId);
    if (!size || size.itemId !== dto.itemId) {
      throw new BadRequestException('Invalid size for item');
    }
  }

  // Validate extras
  for (const extraId of dto.extraIds) {
    const extra = await this.extraRepository.findById(extraId);
    if (!extra || extra.itemId !== dto.itemId) {
      throw new BadRequestException('Invalid extra for item');
    }
  }

  // Add to cart
  const price = await this.calculatePrice(dto);
  await this.cartRepository.addItem(cart.id, { ...dto, price });
}
```

## Cart Expiration

Carts expire after 30 minutes of inactivity:

```typescript
@Cron('0 * * * *')  // Every hour
async cleanupExpiredCarts(): Promise<void> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  await this.cartRepository.deleteWhere({
    expiresAt: { lt: thirtyMinutesAgo }
  });
}
```

## Constraints

- One cart per user per restaurant
- Cart items must be from same restaurant
- Can't add item if unavailable
- Can't add invalid size/extra combinations
- Prices locked when added (protects from price changes)

## Database Schema

```prisma
model Cart {
  id            String      @id @default(cuid())
  userId        String      @unique
  restaurantId  String
  totalInCents  Int
  taxInCents    Int
  items         CartItem[]
  createdAt     DateTime    @default(now())
  expiresAt     DateTime    @default(now() + 30 minutes)
}

model CartItem {
  id            String    @id @default(cuid())
  cartId        String
  itemId        String
  quantity      Int
  sizeId        String?
  extraIds      String[]  // JSON array
  pricePerUnit  Int
  cart          Cart      @relation(fields: [cartId], references: [id], onDelete: Cascade)
}
```

## Best Practices

1. **Server-side pricing** - Never trust client calculations
2. **Validate variants** - Ensure correct combinations
3. **Lock prices** - Store price at add time
4. **Single restaurant** - One cart per restaurant
5. **Auto-expiration** - Clean up old carts
6. **Real-time updates** - WebSocket for live changes (future)
