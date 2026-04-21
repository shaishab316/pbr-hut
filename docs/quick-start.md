# Quick Start

This guide walks you through getting the pbr-hut-backend restaurant ordering API running on your local machine — from zero to a fully operational development server with interactive API documentation. By the end, you will have a NestJS application connected to PostgreSQL and Redis, validating every environment variable at boot, and serving a Scalar-powered API reference at `/docs`.

## Prerequisites

Before you begin, ensure your development environment meets the minimum requirements. Each dependency is enforced at runtime — Node and pnpm versions are checked by package.json engine constraints, and all environment variables are validated by Zod at application boot with a fail-fast strategy.

| Tool | Minimum Version | Purpose | Installation |
|------|-----------------|---------|--------------|
| Node.js | ≥ 20.0.0 | JavaScript runtime for NestJS | nodejs.org |
| pnpm | ≥ 10.20.0 | Package manager (enforced via packageManager) | `corepack enable && corepack prepare pnpm@latest --activate` |
| PostgreSQL | ≥ 14 | Primary relational database | postgresql.org |
| Redis | ≥ 6 | In-memory store for caching and BullMQ job queues | redis.io |
| Git | Any recent | Version control for cloning the repository | git-scm.com |

## Architecture at a Glance

Understanding how the pieces fit together before you start typing commands helps you debug issues faster. The diagram below shows the high-level dependency graph: the NestJS application sits at the center, connecting to PostgreSQL through a Prisma adapter with a managed pg connection pool, to Redis for caching and background mail jobs, and to external services (Stripe, Cloudinary, SMTP) for payments, media uploads, and transactional email.

## Step 1 — Clone and Install

Start by cloning the repository and installing all dependencies. The project uses pnpm as its exclusive package manager — the `packageManager` field in package.json enforces this constraint, and pnpm's strict lockfile ensures deterministic builds across environments.

```bash
git clone https://github.com/shaishab316/pbr-hut.git
cd pbr-hut

# Install dependencies (pnpm is required)
pnpm install
```

If you encounter a package manager mismatch error, make sure pnpm ≥ 10.20.0 is active in your shell. You can verify with `pnpm --version`.

## Step 2 — Configure Environment Variables

The application uses a Zod-validated configuration system defined in `src/config/app.config.ts`. Every variable is checked at boot — if any required value is missing or invalid, the server refuses to start with a descriptive error message. This fail-fast design prevents subtle runtime misconfigurations.

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` in your editor. The table below lists every variable, its purpose, and whether it is required. All values are validated against strict Zod schemas at startup.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment mode: development, test, or production |
| PORT | No | 3000 | HTTP server port (1000–65535) |
| CORS_ORIGIN | No | * | Allowed CORS origins (comma-separated URLs or *) |
| DATABASE_URL | Yes | — | PostgreSQL connection string (must be a valid URL) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection URL |
| JWT_SECRET | Yes | — | JWT signing secret (min 32 characters) |
| JWT_EXPIRES_IN | No | 7d | JWT token expiration (e.g., 7d, 24h) |
| OTP_SECRET | Yes | — | Base secret for OTP generation (min 10 characters) |
| STRIPE_SECRET_KEY | Yes | — | Stripe secret key (must start with sk_) |
| STRIPE_PUBLISHABLE_KEY | Yes | — | Stripe publishable key (must start with pk_) |
| STRIPE_WEBHOOK_SECRET | Yes | — | Stripe webhook secret (must start with whsec_) |
| CLOUDINARY_CLOUD_NAME | Yes | — | Your Cloudinary cloud name |
| CLOUDINARY_API_KEY | Yes | — | Cloudinary API key |
| CLOUDINARY_API_SECRET | Yes | — | Cloudinary API secret |
| SMTP_HOST | Yes | — | SMTP server hostname |
| SMTP_PORT | No | 587 | SMTP server port |
| SMTP_USER | Yes | — | SMTP authentication email |
| SMTP_PASSWORD | Yes | — | SMTP authentication password |
| SMTP_FROM_EMAIL | Yes | — | Sender email address |
| SMTP_FROM_NAME | No | PBR Hut | Sender display name |
| ADMIN_EMAIL | Yes | — | Admin account email |
| ADMIN_PASSWORD | Yes | — | Admin initial password (min 6 characters) |
| LOG_LEVEL | No | log | Logging verbosity: error, warn, log, debug, verbose |
| TEST_OTP | No | 123456 | Fixed OTP for testing (do not use in production) |

A minimal `.env` for local development might look like this:

```env
# ── Server ──
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000

# ── Database ──
DATABASE_URL=postgresql://postgres:password@localhost:5432/pbr_hut?schema=public

# ── Redis ──
REDIS_URL=redis://localhost:6379

# ── Authentication ──
JWT_SECRET=my-super-secret-jwt-key-at-least-32-chars
JWT_EXPIRES_IN=7d
OTP_SECRET=my-otp-base-secret

# ── Stripe (get from https://dashboard.stripe.com) ──
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Cloudinary (get from https://cloudinary.com) ──
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ── Email ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@pbrhut.com
SMTP_FROM_NAME=PBR Hut

# ── Admin ──
ADMIN_EMAIL=admin@pbrhut.com
ADMIN_PASSWORD=admin123456

# ── Testing ──
TEST_OTP=123456
```

## Step 3 — Set Up the Database

The project uses a multi-file Prisma schema split across `prisma/schema/` for maintainability, with a root `prisma/schema/schema.prisma` that declares the PostgreSQL datasource and client generator. The PrismaService uses the `@prisma/adapter-pg` driver with a managed pg connection pool (max 20 connections, 2 minimum idle) for production-grade connection handling.

First, generate the Prisma client from your schema, then apply all pending migrations:

```bash
# Generate the Prisma client (run this after any schema change)
pnpm run prisma:generate

# Apply all pending migrations to your local database
pnpm run prisma:migrate
```

The `prisma:migrate` command runs `prisma migrate dev`, which creates the database tables based on the migration files in `prisma/migrations/`. These migrations cover all domain models: User, RiderProfile, Item, Cart, Order, Restaurant, and Earnings. If this is a fresh database, all migrations will be applied sequentially.

Migration order matters. The migrations in `prisma/migrations/` are timestamped and must be applied in sequence. Never delete migration files — if you need to reset, use `npx prisma migrate reset` which drops and recreates the database, then re-applies all migrations. This is safe for local development but never use in production.

To explore your database visually, use Prisma Studio:

```bash
pnpm run prisma:studio
```

This opens a browser-based GUI at `http://localhost:5555` where you can browse and edit records across all tables.

## Step 4 — Start the Development Server

With dependencies installed, environment configured, and database migrated, you're ready to launch the application in development mode:

```bash
pnpm run start:dev
```

This command runs `nest start --watch`, which compiles TypeScript and restarts the server automatically whenever you save a file. On successful startup, you should see output similar to:

```
[Nest] 12345  - Database connected
[Nest] 12345  - Successfully connected to Redis
[Nest] 12345  - Application is running on: http://localhost:3000
```

The bootstrap sequence in `src/main.ts` performs several initialization steps in order: Helmet security headers, CORS configuration, gzip compression middleware, the global `api/v1` prefix, Zod validation pipe, global response interceptor, and Scalar API documentation setup. If any step fails — particularly database or Redis connection — the error will be logged and the server will not start.

## Step 5 — Verify Everything Works

Once the server is running, verify each integration layer independently using the checklist below. This systematic approach isolates issues to their specific subsystem rather than chasing ambiguous errors.

### API Documentation (Scalar)

Open your browser and navigate to:

```
http://localhost:3000/docs
```

This loads the Scalar API reference UI with the Kepler theme, providing an interactive, modern interface to explore every endpoint. You can authenticate by clicking the "Authorize" button and entering a JWT token obtained from the auth endpoints. The Swagger JSON spec is also available (without UI) at `/api`.

### Bull Board (Job Queue Monitor)

The mail queue is exposed through Bull Board for development visibility:

```
http://localhost:3000/queues
```

This dashboard shows queued, active, completed, and failed mail jobs — useful for debugging transactional email delivery during development.

## Common Issues and Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| Config validation error: DATABASE_URL must be a valid PostgreSQL connection string | Missing or malformed DATABASE_URL in .env | Verify the URL format: `postgresql://user:pass@host:5432/dbname` |
| Error starting the application (no specific message) | Database or Redis unreachable | Ensure PostgreSQL is running on the DATABASE_URL host/port, and Redis on REDIS_URL |
| prisma migrate dev fails with P1001 | Database does not exist | Create it first: `createdb pbr_hut` or use your DB tool |
| Error: Cannot find module '@prisma/client' | Prisma client not generated | Run `pnpm run prisma:generate` |
| CORS errors from frontend | CORS_ORIGIN mismatch | Set CORS_ORIGIN to your frontend URL (e.g., `http://localhost:3001`) |
| pnpm install fails with engine error | Node or pnpm version too old | Update: `node -v` (≥ 20), `pnpm -v` (≥ 10.20) |

## Available Scripts Reference

The package.json defines all commands you'll need during development. Here's a consolidated reference organized by workflow:

| Script | Command | When to Use |
|--------|---------|------------|
| Dev server | `pnpm run start:dev` | Active development with hot-reload |
| Build | `pnpm run build` | Compile TypeScript to dist/ for production |
| Production | `pnpm run start:prod` | Run the compiled build (node dist/main) |
| Lint | `pnpm run lint` | Auto-fix ESLint issues across src/ and test/ |
| Format | `pnpm run format` | Auto-format code with Prettier |
| Unit tests | `pnpm run test` | Run Jest unit tests (root dir: src/) |
| E2E tests | `pnpm run test:e2e` | Run end-to-end tests (test/*.e2e-spec.ts) |
| Prisma generate | `pnpm run prisma:generate` | Regenerate client after schema changes |
| Prisma migrate | `pnpm run prisma:migrate` | Apply pending database migrations |
| Prisma Studio | `pnpm run prisma:studio` | Visual database browser at localhost:5555 |
| Docs dev | `pnpm run docs:dev` | Run VitePress docs locally |
| Docs build | `pnpm run docs:build` | Build static docs to docs/.vitepress/dist |

## Project Structure Overview

The codebase follows a modular NestJS architecture with clear separation between infrastructure, shared utilities, and feature domains. Understanding this layout will help you navigate efficiently as you build.

```
src/
├── main.ts                    # Bootstrap: helmet, CORS, compression, prefix, pipes, docs
├── app.module.ts              # Root module: wiring all feature modules + BullMQ + middleware
├── config/
│   └── app.config.ts          # Zod-validated environment schema (single source of truth)
├── common/                    # Cross-cutting concerns shared across modules
│   ├── config/                # API docs setup, shared configuration
│   ├── decorators/            # Custom decorators (e.g., @CurrentUser)
│   ├── guards/                # Auth guards (JwtGuard, RoleGuard)
│   ├── helpers/               # Pure utility functions (e.g., hash helper)
│   ├── interceptors/          # Global response interceptor
│   ├── mail/                  # BullMQ mail queue + processor
│   ├── middlewares/           # Logger middleware
│   ├── strategies/            # Passport strategies (JWT)
│   ├── types/                 # Shared TypeScript types
│   └── utils/                 # General-purpose utilities
├── infra/
│   └── prisma/                # PrismaService with pg Pool adapter
└── modules/                   # Feature modules (each is self-contained)
    ├── admin/                 # Admin dashboard analytics
    ├── auth/                  # Registration, login, forgot password, contact strategies
    ├── cart/                  # Shopping cart with item variants
    ├── category/              # Menu categories
    ├── item/                  # Menu items with soft delete
    ├── order/                 # Order checkout pipeline
    ├── otp/                   # OTP generation and verification
    ├── redis/                 # Redis service (global module)
    ├── restaurant/            # Restaurant management
    ├── rider/                 # Rider profiles and dispatch
    ├── tag/                   # Item tagging
    ├── upload/                # Cloudinary file uploads
    └── user/                  # User persistence
```

Path alias `@/*` maps to `src/*` in both TypeScript and Jest configurations — always prefer `@/` imports for consistency.

## What's Next?

Now that you have the server running, the best path forward depends on what you want to understand or build next. The documentation is organized progressively — each page builds on concepts introduced earlier.

| Your Goal | Recommended Next Page |
|-----------|----------------------|
| Understand the overall system design | Project Structure Guide |
| Learn how modules connect and communicate | Architecture Overview |
| Build your first authenticated endpoint | JWT Authentication Flow |
| Understand how API responses are shaped | API Conventions and Standards |
| Add a new feature module from scratch | Project Structure Guide → Repository Pattern |

The recommended reading progression for a complete understanding is:

**Overview** → **Quick Start (you are here)** → **Project Structure Guide** → **Architecture Overview** → **API Conventions and Standards** → then dive into specific topics based on your needs.
