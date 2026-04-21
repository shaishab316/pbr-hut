# Architecture Overview

PBR Hut is built on a clean, layered architecture that separates concerns and enables independent scaling. This page provides a deep dive into the architectural patterns, design decisions, and how components interact at runtime.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Flutter Mobile Client                    │
│            (Handles UI, caching, state management)           │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (HTTP)
┌────────────────────────▼────────────────────────────────────┐
│                   API Gateway Layer                          │
│  (Helmet, CORS, Compression, Authentication, Rate Limit)   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              NestJS Application Core                         │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Controller      │  │  Controller      │                │
│  │  (Auth Module)   │  │  (Order Module)  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                          │
│  ┌────────▼──────────────────────▼────┐                    │
│  │      Service Layer                 │                    │
│  │  (Business Logic, Validation)      │                    │
│  └────────┬──────────────────────────┘                     │
│           │                                                │
│  ┌────────▼──────────────────────────┐                    │
│  │    Repository Layer                │                    │
│  │  (Data Access Abstraction)         │                    │
│  └────────┬──────────────────────────┘                     │
│           │                                                │
└───────────┼──────────────────────────────────────────────────┘
            │
    ┌───────┼────────┬──────────┬──────────┐
    │       │        │          │          │
┌───▼────┐ │ ┌─────▼───┐ ┌─────▼──┐ ┌────▼─────┐
│PostgreSQL││Redis    │ │Stripe  │ │Cloudinary│
│Database  ││Cache    │ │Payments│ │Uploads   │
│(Neon)    ││(Upstash)│ └────────┘ │          │
└────────┘ │         │             │          │
           │ ┌─────▼──────────┐    │          │
           │ │BullMQ Queues   │    │          │
           │ │(Mail Jobs)     │    │          │
           │ └────────────────┘    │          │
           └──────────┬────────────┘          │
                      │                       │
                      ├─────────┬─────────────┘
                      │         │
                 ┌────▼──┐  ┌───▼────┐
                 │SMTP   │  │External│
                 │Server │  │APIs    │
                 └───────┘  └────────┘
```

## Layered Architecture

### 1. Transport Layer (HTTP)

The application exposes a REST API on port 3000 (configurable via PORT environment variable):

- **Protocol**: HTTP/1.1
- **API Prefix**: `/api/v1`
- **Documentation**: OpenAPI 3.0 spec at `/api`, interactive UI at `/docs` (Scalar)
- **Rate Limiting**: Enforced at middleware level
- **CORS**: Configurable via `CORS_ORIGIN` environment variable

### 2. Request Pipeline

Every incoming request passes through a standardized pipeline:

```
1. Helmet               → Security headers (CSP, X-Frame-Options, etc.)
2. CORS                → Cross-origin request validation
3. Compression         → gzip encoding for responses
4. Logging Middleware  → Request logging with timestamps
5. Route Handler       → Controller method execution
6. Zod Validation      → Request body validation
7. Authorization       → JWT verification & role checks
8. Business Logic      → Service layer processing
9. Data Access         → Repository queries
10. Response Wrapper   → Interceptor formats response
11. Error Handler      → Global exception filter catches errors
```

### 3. Request Context

Every request carries a user context through the `@CurrentUser()` decorator:

```typescript
@Get('profile')
@UseGuards(JwtGuard)
getProfile(@CurrentUser() user: SafeUser) {
  // user = { id, email, role, iat, exp }
  return user;
}
```

The context is extracted from the JWT token in the Authorization header and validated against the database.

## Modular Architecture

The application is organized into 15 domain modules, each encapsulating:

| Module | Responsibility |
|--------|-----------------|
| **auth** | JWT login, registration, contact strategy, forgot-password |
| **user** | User profile management, preferences |
| **otp** | OTP generation and verification |
| **item** | Menu items, sizes, side options, extras with soft-delete |
| **category** | Menu categories and hierarchy |
| **tag** | Item tagging and filtering |
| **cart** | Server-side cart with inventory validation |
| **order** | Order creation, payment processing, order history |
| **rider** | Rider profiles, NID verification, geospatial dispatch |
| **restaurant** | Restaurant management and metadata |
| **admin** | Dashboard, analytics, operational oversight |
| **upload** | Cloudinary signed URL generation |
| **redis** | Redis connection and caching (global module) |
| **mail** | BullMQ queue for transactional email (global module) |

Each module is independently testable and deployable.

## Data Flow Pattern

### Example: Creating an Order

```
1. Customer sends POST /api/v1/orders with:
   {
     "cartId": "cart_123",
     "addressId": "addr_456",
     "paymentMethodId": "pm_789"
   }

2. OrderController receives request

3. JwtGuard validates token → extracts userId

4. ZodValidationPipe validates request body

5. OrderService executes business logic:
   - Fetches cart from DB
   - Fetches items and apply pricing rules
   - Creates immutable OrderItem snapshots
   - Validates inventory
   - Calculates totals (server-side)
   - Initiates Stripe payment

6. OrderRepository persists to database

7. Order confirmation enqueued to BullMQ

8. ResponseInterceptor wraps response:
   {
     "success": true,
     "statusCode": 201,
     "message": "Order created",
     "data": { order object }
   }

9. Mail processor picks up from queue and sends confirmation email
```

## Caching Strategy

Redis caches frequently accessed data with TTL-based invalidation:

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `menu:categories` | 1 hour | Admin updates category |
| `menu:items:{itemId}` | 30 min | Item price/availability changes |
| `restaurant:{id}` | 2 hours | Admin updates restaurant |

Cache hits are indicated in response headers:

```
X-Cache: HIT     # Served from Redis
X-Cache: MISS    # Database query executed
```

## Authentication & Authorization

### JWT Flow

```
1. User sends credentials to POST /auth/login
2. AuthService verifies password hash
3. Service generates JWT with payload:
   {
     "sub": "user_id",
     "role": "CUSTOMER",
     "email": "user@example.com",
     "iat": timestamp,
     "exp": timestamp + 7 days
   }
4. Token returned to client
5. Client includes in Authorization header for subsequent requests
6. JwtGuard verifies signature and checks expiration
7. RolesGuard enforces role-based access control
```

### Role-Based Access Control (RBAC)

Three principal roles with hierarchical permissions:

| Role | Permissions | Scope |
|------|-------------|-------|
| **CUSTOMER** | Browse items, create orders, view history | Own orders only |
| **RIDER** | View assigned orders, update delivery status | Own deliveries only |
| **ADMIN** | Manage items, restaurants, users, view analytics | Global |

Guards are applied at controller method level:

```typescript
@Post('items')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
createItem(@Body() dto: CreateItemDto) {
  // Only ADMIN can access
}
```

## Error Handling

All errors are caught by the GlobalExceptionFilter and formatted consistently:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

Errors include:
- **ValidationException** (400): Request validation failed
- **UnauthorizedException** (401): Missing or invalid JWT
- **ForbiddenException** (403): User lacks required role
- **NotFoundException** (404): Resource not found
- **ConflictException** (409): Resource already exists
- **InternalServerException** (500): Unexpected server error

## Scalability Considerations

### Horizontal Scaling

The stateless design enables horizontal scaling:
- JWT tokens are self-contained (no session state required)
- Database connections pooled via pg adapter
- Cache operations via Redis (shared state)
- Mail jobs enqueued to Redis-backed BullMQ
- No server-to-server communication required

### Performance Optimizations

1. **Connection Pooling**: pg adapter maintains 20-connection pool
2. **Query Optimization**: Prisma generates efficient SQL
3. **N+1 Prevention**: Eager loading via `include` and `select`
4. **Response Compression**: gzip on all responses
5. **Caching**: Redis for frequently accessed data
6. **Async Jobs**: Mail and notifications via BullMQ

### Database Design

- **Immutable Snapshots**: Order items capture state at purchase time
- **Soft Deletes**: Items soft-deleted to preserve historical data
- **Indexing**: Foreign keys and frequently queried fields indexed
- **Normalization**: Relational schema prevents data duplication

## Integration Points

External services integrated via adapters:

| Service | Purpose | Adapter |
|---------|---------|---------|
| **Stripe** | Payment processing | @stripe/stripe-js SDK |
| **Cloudinary** | File storage | @cloudinary/url-gen |
| **Nodemailer** | SMTP email | nodemailer package |
| **H3** | Geospatial indexing | h3-js package |
| **PostgreSQL** | Data persistence | @prisma/client |
| **Redis** | Caching & queuing | redis package |

Each integration is wrapped in a service for easy mocking in tests.

## Design Patterns Used

| Pattern | Usage |
|---------|-------|
| **Dependency Injection** | NestJS built-in support |
| **Repository** | Data access abstraction |
| **Service** | Business logic layer |
| **DTO** | Request/response validation |
| **Decorator** | Metadata for OpenAPI docs |
| **Guard** | Request-level authorization |
| **Interceptor** | Response transformation |
| **Middleware** | Cross-cutting concerns |
| **Strategy** | Multiple authentication methods (JWT, OTP) |
| **Observer** | Event-driven mail processing |

## Deployment Considerations

- **Stateless**: Can be deployed on any platform
- **Environment-Driven**: All config via environment variables
- **Database Migrations**: Applied at startup via Prisma
- **Health Checks**: `/health` endpoint available
- **Graceful Shutdown**: Services cleanup before exit

## What's Next?

- **Learn about API standards**: See API Conventions and Standards
- **Understand authentication**: See JWT Authentication Flow
- **Dive into a specific module**: Browse the sidebar
