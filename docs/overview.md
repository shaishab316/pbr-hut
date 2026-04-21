# Overview

PBR Hut is a full-featured restaurant ordering backend API built with NestJS 11, Prisma 7, and PostgreSQL. It powers a mobile food ordering experience — from browsing menus and managing carts to placing orders, processing payments via Stripe, and dispatching riders using H3 geospatial indexing. Whether you're a developer looking to contribute or building your own food delivery platform, this guide will walk you through the project's purpose, architecture, and how to navigate the codebase.

## What PBR Hut Does

At its core, PBR Hut is the backend that sits between a Flutter mobile frontend and the data infrastructure needed to run a food ordering service. The API handles three principal user roles — Customers place orders, Riders fulfill deliveries, and Admins manage menus, restaurants, and operational oversight. Every order captures immutable snapshots of item names, prices, and modifiers at checkout time, ensuring that historical records remain accurate even after menu changes.

The system implements server-side pricing as a non-negotiable rule: totals are always recalculated on the backend, never trusted from the client. This is a critical security pattern for any e-commerce platform handling financial transactions.

## Tech Stack

PBR Hut combines battle-tested libraries into a coherent, production-grade backend. Every dependency was chosen for a specific architectural reason, and the stack is designed to scale from a single restaurant to a multi-tenant food delivery platform.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | NestJS 11 | Modular Node.js framework with dependency injection |
| Language | TypeScript 5.7 | Type-safe development with full IDE support |
| ORM | Prisma 7 (multi-file schemas) | Type-safe database access with PostgreSQL adapter |
| Database | Neon PostgreSQL | Serverless Postgres with built-in connection pooling |
| Connection Pool | pg Pool (via @prisma/adapter-pg) | Managed connection pool (max 20, min 2) |
| Cache & Queue | Redis (Upstash) + BullMQ | Menu caching and asynchronous mail processing |
| Validation | Zod + nestjs-zod | Schema-based request validation with compile-time types |
| Authentication | Passport + JWT | Stateless token-based auth with role-based guards |
| Payments | Stripe | Card payments with webhook verification |
| File Storage | Cloudinary | Signed upload URLs with CDN delivery |
| Geospatial | H3 (Uber) | Hexagonal grid indexing for O(1) rider proximity lookups |
| Email | Nodemailer + BullMQ | Asynchronous transactional email delivery |
| API Docs | Scalar + Swagger/OpenAPI | Interactive API reference with modern Kepler theme |
| Package Manager | pnpm 10.20+ | Fast, disk-efficient dependency management |

## System Architecture

The following diagram illustrates how the major components interact at runtime. The Flutter mobile client communicates exclusively through the REST API layer, which is structured around NestJS modules. Each module encapsulates its own controller, service, DTOs, and repository, following a clean separation of concerns.

Every incoming request passes through the global middleware stack — Helmet for security headers, CORS for cross-origin control, compression for gzip encoding, and a LoggerMiddleware that records all requests. The ZodValidationPipe automatically validates request bodies against Zod schemas, and the ResponseInterceptor wraps all successful responses in a consistent `{ success, statusCode, message, data }` envelope before they reach the client.

## Project Structure

The codebase follows NestJS conventions with a modular architecture. Domain logic lives under `src/modules/`, shared cross-cutting concerns under `src/common/`, and infrastructure under `src/infra/`. The Prisma schema is split across multiple files under `prisma/schema/` for maintainability.

```
pbr-hut/
├── 📄 src/
│   ├── 🏁 main.ts
│   ├── 📦 app.module.ts                    # Root module: wires all 15 domain modules
│   ├── ⚙️ config/
│   │   └── app.config.ts                   # Zod-validated environment variables (30+ vars)
│   ├── 🏗️ infra/
│   │   └── prisma/
│   │       └── prisma.service.ts           # PrismaClient + pg Pool adapter
│   ├── 🔧 common/
│   │   ├── config/api-docs.config.ts       # Scalar + Swagger setup
│   │   ├── decorators/                     # @CurrentUser(), @Roles()
│   │   ├── guards/                         # JwtAuthGuard, RolesGuard
│   │   ├── helpers/                        # hash, distance calculation
│   │   ├── interceptors/                   # GlobalResponseInterceptor
│   │   ├── mail/                           # BullMQ mail processor
│   │   ├── middlewares/                    # LoggerMiddleware
│   │   ├── strategies/                     # Passport JWT strategy
│   │   ├── types/                          # Pagination, SafeUser
│   │   └── utils/                          # H3 index, safe JSON parse
│   └── 📦 modules/
│       ├── auth/          # JWT login, register, contact strategy
│       ├── user/          # Profile management
│       ├── otp/           # TOTP verification
│       ├── item/          # Menu items with sizes, sides, extras
│       ├── category/      # Menu categories
│       ├── tag/           # Item tags
│       ├── cart/          # Server-side cart with pricing
│       ├── order/         # Order pipeline + rider order management
│       ├── rider/         # Rider profiles, NID verification, earnings
│       ├── restaurant/    # Restaurant management
│       ├── admin/         # Dashboard analytics & operations
│       ├── upload/        # Cloudinary signed uploads
│       └── redis/         # Redis service abstraction
├── 📄 prisma/
│   └── schema/
│       ├── schema.prisma      # Generator & datasource config
│       ├── enum.prisma        # 8 enums (roles, statuses, sizes, etc.)
│       ├── user.prisma        # User model
│       ├── rider-profile.prisma
│       ├── item.prisma        # Item, Size, SideOption, Extra models
│       ├── cart.prisma        # Cart with variant selections
│       ├── order.prisma       # Order, OrderItem, OrderItemExtra + addresses
│       ├── restaurant.prisma  # Restaurant model
│       └── earning.prisma     # RiderEarning model
├── 📄 docs/                # VitePress documentation site
├── 📄 Makefile             # Dev/prod scripts with esc env management
└── 📄 package.json         # 20+ runtime dependencies
```

Each domain module under `src/modules/` follows a consistent internal structure: a controller (route definitions + Swagger decorators), a service (business logic), DTOs (Zod-validated request/response shapes), a docs folder (Swagger response examples), and a repository (data access layer). This uniformity makes it easy to navigate between modules — once you understand one, you understand them all.

## Key Features at a Glance

The following table summarizes the core capabilities of the system, organized by functional domain. Each feature links to a dedicated deep-dive page in this handbook for detailed implementation walkthroughs.

| Domain | Feature | Description |
|--------|---------|-------------|
| Auth | JWT Authentication | Stateless login/register with access tokens |
| Auth | Role-Based Access | Three roles (Customer, Admin, Rider) with guard enforcement |
| Auth | OTP Verification | Time-based OTP for phone/email verification |
| Auth | Contact Strategy | Login by email or phone via strategy pattern |
| Menu | Item Management | Items with sizes, side options, extras, and soft delete |
| Menu | Categories & Tags | Hierarchical categorization with tag-based filtering |
| Cart | Server-Side Cart | Cart with server-authoritative pricing and modifier validation |
| Orders | Checkout Pipeline | Order creation with snapshots, billing breakdown, and address management |
| Orders | Delivery & Pickup | Dual order types (DELIVERY / PICKUP) with scheduled timing |
| Payments | Stripe Integration | Card payments with webhook verification and refund support |
| Riders | Geospatial Dispatch | H3 hex grid for O(1) rider proximity lookups |
| Riders | Earnings Tracking | Per-delivery earnings with settlement lifecycle |
| Admin | Dashboard Analytics | Revenue, order volume, and operational metrics |
| Infra | Redis Caching | Menu cache with TTL-based invalidation |
| Infra | Mail Queue | BullMQ-powered async transactional email |
| Infra | File Uploads | Cloudinary signed URLs for image management |

## Global Response Format

Every API response passes through the ResponseInterceptor, which wraps results in a standardized envelope. This consistency simplifies frontend parsing and error handling. Responses include a cache indicator header (X-Cache) when data is served from Redis, and pagination metadata when applicable.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

## Environment Configuration

All environment variables are validated at startup using a Zod schema in `src/config/app.config.ts`. The application will refuse to start if any required variable is missing or malformed — this catches configuration errors before they reach production. The system requires over 30 environment variables covering database, Redis, JWT, Stripe, Cloudinary, SMTP, and admin setup.

The CORS_ORIGIN variable supports both a wildcard (*) and a comma-separated list of URLs. In development it defaults to *, but production deployments should explicitly list allowed origins for security.

## API Documentation

When the development server is running, interactive API documentation is available at `/docs` via the Scalar reference UI (with the Kepler theme). The underlying OpenAPI spec is generated from Swagger decorators on every controller and DTO. You can explore all endpoints, test requests with bearer tokens, and download the spec in both JSON and YAML formats.

The docs route is deliberately excluded from Helmet's Content-Security-Policy header to allow Scalar's assets to load correctly.

## Requirements

Before you begin, ensure your development environment meets these minimum requirements:

| Tool | Minimum Version | Purpose |
|------|-----------------|---------|
| Node.js | ≥ 20.0.0 | Runtime |
| pnpm | ≥ 10.20.0 | Package manager |
| PostgreSQL | 14+ | Database (or use a managed Neon instance) |
| Redis | 7.0+ | Cache and job queue (or use Upstash) |

## What's Next?

This Overview covered the "what" and "why" of PBR Hut. Here's a recommended reading path based on your goals:

- **Get the project running locally:** → Quick Start — step-by-step setup instructions
- **Understand the codebase layout:** → Project Structure Guide — detailed directory walkthrough
- **Understand the architectural decisions:** → Architecture Overview — deep dive into patterns and conventions
- **Interested in a specific domain:** → Jump to any page in the Deep Dive section using the sidebar navigation
