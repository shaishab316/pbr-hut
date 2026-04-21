# Menu and Item Management

Menu items are the core of the ordering system. Items have sizes, side options, and extras that customers can choose during ordering.

## Data Model

```
Item
├── Sizes (e.g., Small, Medium, Large)
├── SideOptions (e.g., extra sauce, no onions)
└── Extras (e.g., bacon, cheese)
```

## Item Structure

```typescript
interface Item {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  restaurantId: string;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  isSoftDeleted: boolean;
  createdAt: Date;
}

interface Size {
  id: string;
  name: string;           // "Small", "Medium", "Large"
  priceInCents: number;   // Additional price
}

interface SideOption {
  id: string;
  name: string;           // "No onions", "Extra sauce"
  priceInCents: number;   // Additional price
}

interface Extra {
  id: string;
  name: string;           // "Bacon", "Cheese"
  priceInCents: number;   // Additional price
}
```

## Endpoints

### Get Menu Items

```bash
GET /api/v1/items?categoryId=cat_1&restaurantId=rest_1&page=1&limit=10
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "item_1",
      "name": "Burger",
      "description": "Delicious beef burger",
      "priceInCents": 500,
      "sizes": [
        { "id": "size_1", "name": "Small", "priceInCents": 0 },
        { "id": "size_2", "name": "Large", "priceInCents": 100 }
      ],
      "sideOptions": [
        { "id": "side_1", "name": "No onions", "priceInCents": 0 },
        { "id": "side_2", "name": "Extra sauce", "priceInCents": 50 }
      ],
      "extras": [
        { "id": "extra_1", "name": "Bacon", "priceInCents": 100 },
        { "id": "extra_2", "name": "Cheese", "priceInCents": 75 }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

### Create Item (Admin Only)

```bash
POST /api/v1/items
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Burger",
  "description": "Delicious beef burger",
  "priceInCents": 500,
  "restaurantId": "rest_1",
  "categoryId": "cat_1",
  "imageUrl": "https://...",
  "sizes": [
    { "name": "Small", "priceInCents": 0 },
    { "name": "Large", "priceInCents": 100 }
  ],
  "sideOptions": [
    { "name": "No onions", "priceInCents": 0 },
    { "name": "Extra sauce", "priceInCents": 50 }
  ],
  "extras": [
    { "name": "Bacon", "priceInCents": 100 }
  ]
}
```

### Update Item (Admin Only)

```bash
PATCH /api/v1/items/item_1
Authorization: Bearer <admin_token>

{
  "name": "Premium Burger",
  "priceInCents": 600,
  "isAvailable": false
}
```

### Soft Delete (Admin Only)

```bash
DELETE /api/v1/items/item_1
Authorization: Bearer <admin_token>
```

Item is marked `isSoftDeleted = true` but not removed from database, preserving order history.

## Categories

```bash
GET /api/v1/categories
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_1",
      "name": "Burgers",
      "description": "All burger varieties",
      "imageUrl": "https://..."
    }
  ]
}
```

## Tags

Items can be tagged for filtering:

```bash
GET /api/v1/items?tags=vegan,spicy
```

Tags like: `vegan`, `spicy`, `bestseller`, `new`, `limited-time`

## Pricing

All prices stored as integers (cents):
- $10.50 = 1050 cents
- $0.99 = 99 cents

This avoids floating-point precision issues.

## Availability

Control item availability:

```typescript
@Patch('items/:id/availability')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
updateAvailability(
  @Param('id') id: string,
  @Body() dto: { isAvailable: boolean }
) {
  return this.itemService.updateAvailability(id, dto.isAvailable);
}
```

## Cache

Menu items cached in Redis with 30-minute TTL:

```
menu:items:{restaurantId}
menu:categories
```

Cache invalidated when items updated.

## Best Practices

1. **Use soft deletes** - Preserve order history
2. **Cache menu data** - Reduce database load
3. **Validate sizes/options exist** - Before adding to cart
4. **Use prices in cents** - Avoid floating-point issues
5. **Support image CDN** - Use Cloudinary URLs
6. **Tag items** - Enable filtering
7. **Track availability** - Per-item availability control

## Database Indexes

```prisma
model Item {
  restaurantId String
  categoryId String
  
  @@index([restaurantId, isSoftDeleted])  // Restaurant's items
  @@index([categoryId])                   // Items by category
}
```

## Validation

```typescript
const CreateItemDto = z.object({
  name: z.string().min(1).max(100),
  priceInCents: z.number().int().positive(),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  restaurantId: z.string().uuid(),
});
```
