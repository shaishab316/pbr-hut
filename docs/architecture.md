# Architecture

## 1. Overview
Restaurant mobile ordering platform. Flutter frontend calls NestJS backend API. All data persisted in Neon PostgreSQL. Redis (Upstash) handles caching + job queue. Images stored in Cloudinary.

**Stack:**
- Mobile: Flutter
- Backend: NestJS + Prisma
- Database: Neon PostgreSQL
- Cache/Queue: Upstash Redis
- Images: Cloudinary
- Payments: Stripe

**Code Style:** camelCase for all code and database fields.

## 2. System Diagram
```
Flutter App
    ↓ (HTTPS)
NestJS API
    ├→ Prisma ORM
    │   ↓
    │   Neon PostgreSQL
    ├→ Upstash Redis
    │   ├─ Cache (menu)
    │   └─ BullMQ (background jobs)
    ├→ Cloudinary (images)
    └→ Stripe (payments)
```

## 3. API Modules

| Module | Purpose |
|--------|---------|
| **auth** | JWT login/register, role-based access (customer, admin) |
| **menu** | GET categories/items/modifiers; Redis cache layer |
| **cart** | Validate modifiers (min/max rules); **server-side pricing** |
| **orders** | Create order with **snapshots**; status tracking (PENDING → CONFIRMED → PREPARING → READY → DELIVERED) |
| **payments** | Stripe integration, webhook verification |
| **admin** | Manage menu items, availability, order status |
| **uploads** | Cloudinary signed upload URLs for images |

## 4. Database Schema (camelCase)

**Menu (editable):**
- `Category` (id, name, sortOrder)
- `SubCategory` (id, name, categoryId, sortOrder)
- `Item` (id, name, basePrice, imageUrl, imagePublicId, isAvailable, sortOrder)
- `ModifierGroup` (id, name, minSelect, maxSelect, isFree)
- `Modifier` (id, name, price, isAbsolute, sortOrder)
- `ItemModifierGroup` (itemId, modifierGroupId) ← many-to-many

**Orders (immutable):**
- `Order` (id, total, status, createdAt)
- `OrderItem` (id, orderId, itemName, basePrice, quantity, totalPrice) ← **snapshots**
- `SelectedModifier` (id, orderItemId, modifierName, price) ← **snapshots**

## 5. Key Flows

### Browse Menu
```
Flutter: GET /api/menu
  ↓
NestJS: check Upstash cache
  ├→ HIT → return
  └→ MISS → query Neon → cache with TTL → return
```

### Add to Cart
```
Flutter: { itemId, selectedModifiers }
  ↓
NestJS:
  1. Validate: modifiers belong to item's groups
  2. Validate: minSelect/maxSelect rules satisfied
  3. Calculate: basePrice + modifier deltas
  ↓
Return: validated cart + total
```

### Create Order
```
Flutter: checkout { cart }
  ↓
NestJS:
  1. Recalculate totals (server-authoritative)
  2. Write to Neon (transaction):
     - Order record
     - OrderItem[] with snapshots (itemName, basePrice)
     - SelectedModifier[] with snapshots (modifierName, price)
  3. Enqueue payment/receipt job to Redis
  ↓
Return: orderId
```

### Stripe Payment
```
Flutter → Stripe SDK (complete payment)
  ↓
Stripe webhook → NestJS
  ↓
NestJS: verify signature → mark order CONFIRMED in Neon → enqueue receipt email
  ↓
Worker: process email job asynchronously
```

### Admin Upload Image
```
Admin: POST /api/admin/uploads/sign
  ↓
NestJS: return Cloudinary signed params
  ↓
Admin: upload directly to Cloudinary → get publicId + secureUrl
  ↓
Admin: PATCH /api/admin/items/:id { imagePublicId, imageUrl }
  ↓
NestJS: save to Neon
```

## 6. Critical Production Rules

| Rule | Reason |
|------|--------|
| **Server-side pricing** | Never trust client totals. Recalculate on order creation. |
| **Order snapshots** | Store item/modifier names + prices at checkout. Menu changes don't corrupt history. |
| **No hard deletes** | Use `isAvailable=false`. Keep records for analytics + order references. |
| **JWT + role checks** | Admin endpoints require auth + role validation. |
| **Stripe webhook verification** | Always verify payment provider signatures. |
| **Env secrets** | API keys in env vars. Never in code. |
| **Redis persistence** | BullMQ state must survive restarts. |
| **camelCase everywhere** | Code, database fields, API responses all use camelCase. |

## 7. Deployment

**NestJS API:**
- Deploy to Railway, Render, Fly.io, or similar Node.js platform
- Env vars: DATABASE_URL, UPSTASH_REDIS_REST_URL, STRIPE_SECRET_KEY, etc.
- Health check: GET `/api/health`

**Neon PostgreSQL:**
- Managed database (automatic backups)
- Connection pooling built-in
- All fields follow camelCase

**Upstash Redis:**
- Managed cache + queue backend
- Access via REST or native Redis protocol

**Cloudinary:**
- CDN images automatically
- Store only `publicId` + `secureUrl` in DB

## 8. Scaling Path
1. Multiple NestJS instances (platform load balancer handles)
2. Separate worker process for BullMQ as job volume grows
3. Add WebSocket layer for real-time order updates (Socket.io)
4. Analytics DB for reporting (BigQuery, ClickHouse)

---

**Key principle:** Backend is source of truth. Never trust client. Snapshot everything at order time. Maintain camelCase consistency across all layers.