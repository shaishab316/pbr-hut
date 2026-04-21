# PBR Hut Backend

> **Production-grade food delivery platform API** — built with NestJS, Prisma, PostgreSQL, and Redis.

A comprehensive backend system for restaurant ordering and rider dispatch, featuring JWT authentication, role-based access control, Stripe payments, H3 geospatial indexing, and real-time order management.

[![Documentation](https://img.shields.io/badge/📖%20Handbook-shaishab316.github.io%2Fpbr--hut-0066cc?style=flat-square&logo=github)](https://shaishab316.github.io/pbr-hut/)
[![Node](https://img.shields.io/badge/Node-20%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-ea2845?style=flat-square&logo=nestjs)](https://nestjs.com/)

---

## 📚 Full Documentation

**Complete architecture, design patterns, API conventions, and implementation guides are available in the interactive handbook:**

### [📖 Read the Handbook → https://shaishab316.github.io/pbr-hut/](https://shaishab316.github.io/pbr-hut/)

This README focuses on setup and local development. For detailed information on system design, authentication flows, database schema, caching strategies, and business logic, please refer to the handbook.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | NestJS 11 | Modular, scalable Node.js backend |
| **Language** | TypeScript 5.7 | Type-safe development with full IDE support |
| **ORM** | Prisma 7 | Type-safe database access with multi-file schemas |
| **Database** | Neon PostgreSQL | Serverless Postgres with connection pooling |
| **Authentication** | Passport + JWT | Stateless token-based auth with RBAC |
| **Payments** | Stripe | Secure card processing with webhook verification |
| **Caching** | Redis + BullMQ | Menu caching and asynchronous task queues |
| **Geospatial** | H3 (Uber) | Hexagonal grid indexing for rider proximity |
| **File Storage** | Cloudinary | CDN delivery with signed upload URLs |
| **Validation** | Zod + nestjs-zod | Schema-based request validation |
| **API Docs** | Scalar + OpenAPI | Interactive API reference |

---

## Quick Start

### Prerequisites

```bash
Node   ≥ 20
pnpm   ≥ 10.20
```

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env

# Generate Prisma client
pnpm prisma:generate

# Start development server
pnpm start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

Interactive API documentation (Scalar) is automatically served at `http://localhost:3000/api/docs`.

---

## Development Commands

```bash
# Development
pnpm start:dev      # Run with watch mode (recommended)
pnpm start:debug    # Run with Node debugger
pnpm build          # Compile for production

# Testing
pnpm test           # Run unit tests
pnpm test:watch     # Run tests with watch mode
pnpm test:e2e       # Run end-to-end tests

# Database
pnpm prisma:migrate # Create new migration
pnpm prisma:push    # Sync schema to database
pnpm prisma:studio  # Open Prisma Studio UI

# Documentation
pnpm docs:dev       # Local handbook preview (VitePress)
pnpm docs:build     # Build static documentation
```

---

## Project Structure

```
src/
├── app.module.ts              # Root module with dependency injection
├── main.ts                    # Application entry point
├── common/                    # Shared utilities, guards, interceptors
│   ├── decorators/           # Custom decorators (@CurrentUser, @CacheKey, etc.)
│   ├── guards/               # Auth guards (JWT, Roles)
│   ├── interceptors/         # Response wrapping, caching, logging
│   ├── pipes/                # Validation pipes
│   └── utils/                # Helpers and utilities
├── modules/                   # 15+ domain modules
│   ├── auth/                 # JWT & OAuth strategies
│   ├── user/                 # User profiles & authentication
│   ├── restaurant/           # Restaurant management
│   ├── item/                 # Menu items with soft deletes
│   ├── cart/                 # Shopping cart with variants
│   ├── order/                # Orders, checkout, payments
│   ├── rider/                # Rider dispatch & H3 indexing
│   ├── redis/                # Caching layer
│   ├── upload/               # Cloudinary integration
│   └── ...                   # Additional modules
└── infra/                    # Infrastructure & external services
    └── prisma/              # Database client & pooling
```

---

## Architecture Highlights

### 🔐 Security First
- Server-side pricing validation (never trust client calculations)
- JWT-based stateless authentication
- Role-based access control (Customer, Rider, Admin)
- Secure payment handling via Stripe webhooks

### ⚡ Performance Optimized
- Redis caching with TTL-based invalidation
- Connection pooling (pg pool: min 2, max 20)
- BullMQ for asynchronous email delivery
- H3 geospatial indexing for O(1) rider lookups

### 📊 Data Integrity
- Multi-file Prisma schemas for scalability
- Immutable order snapshots (item prices at checkout)
- Soft deletes for audit trails
- Type-safe repository pattern

### 📱 Complete Feature Set
- Multi-restaurant support
- Menu variants and modifiers
- Cart management with item customization
- Order lifecycle tracking
- Rider dispatch and delivery tracking
- Admin analytics and dashboard

---

## Configuration

Environment variables are validated with Zod at startup. See `.env.example` for required variables:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# File Storage
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email
MAIL_FROM=noreply@example.com
MAIL_HOST=smtp.example.com
```

Refer to the [Environment Configuration guide](https://shaishab316.github.io/pbr-hut/environment-config-with-zod) in the handbook for complete details.

---

## API Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User retrieved successfully",
  "data": { }
}
```

Errors are wrapped with appropriate HTTP status codes and error descriptions.

---

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:cov
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Follow the coding standards outlined in the handbook
3. Write tests for new functionality
4. Push to `dev` branch for review
5. Create a pull request with a clear description

---

## License

UNLICENSED — see [package.json](./package.json).

---

## Support & Documentation

- **[📖 Full Handbook](https://shaishab316.github.io/pbr-hut/)** — Architecture, design patterns, implementation guides
- **[API Documentation](https://shaishab316.github.io/pbr-hut/api-documentation-with-scalar)** — Interactive OpenAPI reference
- **[Quick Start Guide](https://shaishab316.github.io/pbr-hut/quick-start)** — Getting started with PBR Hut

---

**Maintainer:** [@shaishab316](https://github.com/shaishab316)
