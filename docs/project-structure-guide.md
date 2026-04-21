# Project Structure Guide

The pbr-hut backend follows a modular NestJS architecture with clear separation of concerns. This guide walks you through the directory structure, explaining the purpose of each folder and how they interact.

## Root Directory Structure

```
pbr-hut/
├── src/                       # Application source code
├── prisma/                    # Database schema and migrations
├── docs/                      # VitePress documentation
├── test/                      # End-to-end tests
├── dist/                      # Compiled output (generated)
├── node_modules/              # Dependencies (generated)
├── .env                       # Environment variables (local)
├── .env.example               # Environment template
├── .eslintrc                  # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tsconfig.json              # TypeScript compiler configuration
├── nest-cli.json              # NestJS CLI configuration
├── Makefile                   # Development scripts
├── docker-compose.yml         # Docker services for dev
├── package.json               # Dependencies and scripts
├── pnpm-lock.yaml             # Dependency lock file
└── README.md                  # Project overview
```

## Source Code Organization

The `src/` directory is organized into four main categories:

### 1. Entry Point

```
src/
├── main.ts                    # Application bootstrap
└── app.module.ts              # Root module
```

**main.ts**: Initializes NestJS application with:
- Helmet security headers
- CORS middleware
- Request compression
- Global API prefix (`api/v1`)
- Zod validation pipe
- Response interceptor
- Scalar API documentation

**app.module.ts**: Wires all feature modules together and registers global providers like Redis and BullMQ.

### 2. Infrastructure Layer

```
src/infra/
└── prisma/
    └── prisma.service.ts     # PrismaClient with pg Pool adapter
```

Handles all database connection logic and connection pooling.

### 3. Cross-Cutting Concerns

```
src/common/
├── config/
│   ├── app.config.ts         # Environment variables (Zod schema)
│   └── api-docs.config.ts    # Swagger/Scalar setup
├── decorators/
│   ├── current-user.decorator.ts    # @CurrentUser()
│   ├── roles.decorator.ts           # @Roles()
│   └── cache.decorator.ts           # @CacheKey()
├── guards/
│   ├── jwt.guard.ts          # @UseGuards(JwtGuard)
│   └── roles.guard.ts        # Role-based access control
├── helpers/
│   ├── hash.helper.ts        # Password hashing
│   └── calculateDistance.ts  # Geospatial calculations
├── interceptors/
│   ├── response.interceptor.ts       # Standardized response format
│   └── cache.interceptor.ts          # Redis caching
├── mail/
│   └── mail.processor.ts     # BullMQ mail queue processor
├── middlewares/
│   └── logger.middleware.ts  # Request logging
├── strategies/
│   └── jwt.strategy.ts       # Passport JWT strategy
├── types/
│   ├── pagination.ts         # Pagination types
│   └── user.types.ts         # User-related types
└── utils/
    ├── h3.util.ts            # H3 geospatial indexing
    └── safe-json.util.ts     # Safe JSON parsing
```

These are shared across all modules.

### 4. Feature Modules

```
src/modules/
├── admin/                     # Dashboard & analytics
├── auth/                      # Authentication
├── cart/                      # Shopping cart
├── category/                  # Menu categories
├── item/                      # Menu items
├── order/                     # Orders & checkout
├── otp/                       # OTP verification
├── redis/                     # Redis abstraction (global)
├── restaurant/                # Restaurant management
├── rider/                     # Rider profiles & dispatch
├── tag/                       # Item tags
├── upload/                    # Cloudinary uploads
└── user/                      # User profiles
```

Each module follows an internal structure:

```
modules/auth/
├── auth.controller.ts         # Route handlers + Swagger
├── auth.service.ts            # Business logic
├── auth.module.ts             # Module definition
├── dtos/
│   ├── login.dto.ts           # Zod schemas for requests
│   ├── register.dto.ts
│   └── responses/             # Swagger response examples
├── repository/
│   └── auth.repository.ts     # Data access layer
└── docs/
    └── examples.ts            # Swagger example responses
```

## Prisma Schema Organization

The Prisma schema is split across multiple files for maintainability:

```
prisma/
├── migrations/
│   ├── 20260328102709_user/
│   ├── 20260402081825_rider_profile/
│   ├── 20260402082618_item/
│   └── ... (more migrations)
└── schema/
    ├── schema.prisma          # Generator & datasource config
    ├── enum.prisma            # All enums (roles, statuses, etc.)
    ├── user.prisma            # User model
    ├── rider-profile.prisma   # Rider models
    ├── item.prisma            # Item, Size, Extra models
    ├── cart.prisma            # Cart & CartItem models
    ├── order.prisma           # Order & OrderItem models
    ├── restaurant.prisma      # Restaurant model
    ├── earning.prisma         # RiderEarning model
    └── ads.prisma             # Ads models
```

The root `prisma.config.ts` references `prisma/schema/schema.prisma` as the schemaPath.

## TypeScript Configuration

Path aliases are configured for clean imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Always use `@/` imports instead of relative paths:

```typescript
// ✅ Good
import { AuthService } from '@/modules/auth/auth.service';

// ❌ Avoid
import { AuthService } from '../../modules/auth/auth.service';
```

## Testing Structure

```
test/
├── auth.e2e-spec.ts          # End-to-end tests
└── jest-e2e.json             # Jest E2E configuration
```

Unit tests live alongside source files with `.spec.ts` extension:

```
src/common/helpers/
├── hash.helper.ts
└── hash.helper.spec.ts
```

## Environment Configuration

Configuration is centralized in `src/config/app.config.ts` using Zod schemas. This provides:
- Type-safe environment variables
- Validation at application startup
- Single source of truth
- Descriptive error messages if validation fails

## Build Output

After running `pnpm run build`, the compiled JavaScript is in `dist/`:

```
dist/
├── main.js                    # Compiled entry point
├── app.module.js
├── modules/                   # Compiled modules
├── common/                    # Compiled common utilities
└── infra/                     # Compiled infrastructure
```

## Running Different Environments

| Command | Purpose |
|---------|---------|
| `pnpm run start:dev` | Development with hot-reload (watches TypeScript) |
| `pnpm run build` | Compile to JavaScript |
| `pnpm run start:prod` | Run compiled code (node dist/main.js) |

## Module Conventions

Every feature module should follow this pattern:

1. **Controller**: Defines routes and Swagger decorators
2. **Service**: Contains business logic
3. **Repository**: Handles database queries
4. **DTOs**: Zod schemas for validation
5. **Module**: Imports/exports providers

This uniformity makes it easy to navigate between modules — once you understand one, you understand them all.

## Best Practices

- Use `@/` path aliases for imports
- Organize code by feature (vertical slicing), not layer
- Keep controllers thin — move logic to services
- Keep services thin — move data access to repositories
- Use the global `RedisModule` for caching
- Use the global `MailModule` for sending emails
- Document complex business logic with comments

## Next Steps

- **Understand module communication**: See Architecture Overview
- **Set up locally**: See Quick Start
- **Learn about a specific pattern**: Browse the Deep Dive section
