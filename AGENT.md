This file is the **canonical quick-reference** for anyone (human or AI) working in this repository. Prefer it over guessing conventions. Deeper product and domain rules live in `docs/architecture.md` and module docs under `docs/`.

---

## 1. What this is

- **Name:** `pbr-hut-backend`
- **Purpose:** REST API for a restaurant mobile ordering platform (menu, cart, orders, payments, admin). The repo description and `docs/architecture.md` describe the **target** system; **implemented today** focuses on auth, users, riders, OTP, mail, Redis, uploads, and Prisma/PostgreSQL.
- **Stack:** NestJS 11, TypeScript 5.7+, Prisma 7 + PostgreSQL (`@prisma/adapter-pg` + `pg` Pool), Redis (ioredis + BullMQ), Zod 4 + **nestjs-zod** for request validation, Swagger + Scalar for API docs, Cloudinary for media, Nodemailer/Bull for mail.

---

## 2. Tooling & how to run


| Requirement         | Notes                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node**            | `>= 20`                                                                                                                                      |
| **Package manager** | **pnpm** `>= 10.20.0` (see `package.json` `packageManager`)                                                                                  |
| **Env**             | Copy `.env.example` → `.env`. `ConfigModule` validates env at boot via `src/config/app.config.ts` (Zod). Missing/invalid vars **fail fast**. |


**Common commands:**

```bash
pnpm install
pnpm run start:dev          # dev server with watch
pnpm run build              # nest build → dist/
pnpm run lint               # eslint --fix
pnpm run format             # prettier write src + test
pnpm run test               # unit tests (jest, rootDir: src)
pnpm run test:e2e           # e2e (config: test/jest-e2e.json)
pnpm run prisma:generate    # after schema changes
pnpm run prisma:migrate     # prisma migrate dev (local dev)
```

**API entry:** HTTP server; global prefix `**api/v1`** (`src/main.ts`). **Docs:** Scalar UI at `/docs`; OpenAPI JSON still built for Swagger at `/api` (Swagger UI disabled in code).

---

## 3. Repository layout

```
src/
  main.ts                 # bootstrap: helmet, cors, compression, prefix, ZodValidationPipe, ResponseInterceptor, docs
  app.module.ts           # root module, middleware, Bull, feature imports
  config/                 # env validation (Zod) — single source of truth for Env type
  common/                 # cross-cutting: guards, decorators, interceptors, helpers, mail, middlewares, strategies
  infra/                  # e.g. prisma (PrismaService)
  modules/                # feature modules: auth, user, otp, redis, upload, …
    <feature>/
      *.module.ts
      *.controller.ts
      *.service.ts
      dto/                # Zod schemas + createZodDto classes
      docs/               # Swagger decorator bundles + sometimes models/
      repository/ or repositories/
      strategies/         # when behavior is strategy-based (e.g. auth contacts)
prisma/
  schema/                 # split Prisma schema (schema.prisma imports user.prisma, rider-profile.prisma, …)
  migrations/
prisma.config.ts          # Prisma 7 config: schema dir, migrations path, DATABASE_URL
test/                     # e2e specs (not under src/)
docs/                     # human docs (architecture, auth flows, …)
```

**Path alias:** `@/*` → `src/*` (see `tsconfig.json`). Use `@/...` for app imports; you may also see `src/...` in a few files—prefer `**@/`** for consistency in new code.

---

## 4. Code style (mandatory habits)


| Topic               | Rule                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Naming**          | **camelCase** for code, JSON, and DB fields in Prisma (project convention).                                                                     |
| **Quotes / commas** | Prettier: **single quotes**, **trailing commas** where valid (`.prettierrc`).                                                                   |
| **Formatting**      | Run `pnpm run format`; CI/local should stay Prettier-clean. ESLint extends recommended TypeScript + Prettier integration (`eslint.config.mjs`). |
| `**any`**           | ESLint rule `@typescript-eslint/no-explicit-any` is **off**—still prefer explicit types for new code.                                           |
| **Comments**        | Light use of `//?` for section markers is present in the codebase; match local style.                                                           |
| **Strictness**      | `strictNullChecks: true`; `noImplicitAny: false` in tsconfig—do not rely on implicit `any` for new code.                                        |


---

## 5. HTTP API conventions

1. **Validation:** Global `**ZodValidationPipe`** (`nestjs-zod`). DTOs = Zod schema + `createZodDto(...)`. Export `z.infer<typeof Schema>` as `*Input` types for services.
2. **Responses:** Global `**ResponseInterceptor`** wraps successful payloads as `{ success, statusCode, message, data }`, with optional `meta`. Services/controllers often return `{ message, data }` or plain `data`—know the interceptor shape when documenting or testing.
3. **Cache header:** If a handler returns an object with `__cache`, the interceptor strips it and sets `**X-Cache`** (see `response.interceptor.ts`).
4. **Auth:** JWT via Passport (`JwtStrategy`, `JwtGuard`). `**CurrentUser`** decorator reads `SafeUser` from the request. Role enum in Prisma: `UserRole` (`CUSTOMER`, `ADMIN`, `RIDER`).
5. **Swagger:** Route-level docs use custom composable decorators under `modules/*/docs/` (e.g. `ApiSignUp()`), sometimes with `ApiExtraModels` + discriminator for unions.

---

## 6. Configuration & secrets

- **All configuration** goes through `**ConfigService<Env, true>`** with keys defined in `src/config/app.config.ts`.
- **Never commit secrets.** Use `.env` locally; production uses the same variable names as in the Zod schema.
- Notable keys: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, OTP/Stripe/Cloudinary/SMTP, `ADMIN_*`, optional `TEST_OTP` for dev/test.

---

## 7. Database & Prisma

- **Schema:** Multi-file under `prisma/schema/`; root `schema.prisma` sets generator/datasource; models in `user.prisma`, `rider-profile.prisma`, etc.
- **Migrations:** `prisma/migrations/` — use `**pnpm run prisma:migrate`** (or team’s documented flow) after model changes; then `**pnpm run prisma:generate**`.
- **Runtime client:** `PrismaService` extends `PrismaClient` with `**PrismaPg` adapter** and a `**pg` Pool** (connection limits/timeouts set in constructor). Lifecycle: connect on init, disconnect on destroy.
- **IDs:** Example: `User.id` uses `@default(ulid())` — follow existing patterns for new models.

---

## 8. Domain modules (current codebase)


| Area            | Role                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **auth**        | Register/login, OTP verification, forgot/reset password, rider signup; contact strategies (email vs phone); uses `AuthCacheRepository`, `OtpModule`, `UserModule`. |
| **user**        | User + rider persistence via repositories.                                                                                                                         |
| **otp**         | OTP generation/verification (used by auth).                                                                                                                        |
| **redis**       | Shared Redis connection for caching/queues as wired in `AppModule`.                                                                                                |
| **upload**      | Cloudinary integration, file upload interceptor.                                                                                                                   |
| **common/mail** | Queue + processor (BullMQ); constants like `MAIL_QUEUE`.                                                                                                           |


**Queues:** BullMQ root config uses `REDIS_URL`; Bull Board mounted at `**/queues`** (non-prefixed path—different from `api/v1`).

---

## 9. Testing

- **Unit tests:** `*.spec.ts` next to sources under `src/`; Jest `rootDir` is `src`; `@/` maps in Jest via `moduleNameMapper`.
- **E2E:** `test/*.e2e-spec.ts`, separate Jest config; may mock helpers (e.g. `hash.helper`) and wire controllers with test doubles.
- Prefer testing **services** and **pure helpers** deeply; controllers **integration-style** where valuable.

---

## 10. Adding a new feature (checklist)

1. Create `**modules/<name>/`** with `*.module.ts`, register in `app.module.ts`.
2. **DTOs:** Zod schema + `createZodDto`; export inferred types for the service layer.
3. **Docs:** Optional `docs/*.docs.ts` + `docs/models/*` for Swagger/Scalar if the route is external.
4. **Prisma:** Add/alter models in `prisma/schema/`, migrate, generate.
5. **Auth:** Use `JwtGuard` + `@CurrentUser()` where routes are protected; align with `UserRole`.
6. **Responses:** Return shapes compatible with `**ResponseInterceptor`** expectations.
7. **Lint/format/test** before opening a PR.

---

## 11. Known gaps / TODOs (do not assume done)

- `main.ts` mentions a **global exception filter** as TODO — errors may not yet be unified across the app.
- `docs/architecture.md` describes **menu, cart, orders, payments** modules; verify the repo state before implementing against that doc-only API surface.

---

## 12. File naming reference


| Pattern           | Use                                 |
| ----------------- | ----------------------------------- |
| `*.module.ts`     | Nest module                         |
| `*.controller.ts` | HTTP controller                     |
| `*.service.ts`    | Injectable business logic           |
| `*.dto.ts`        | Zod + DTO class                     |
| `*.spec.ts`       | Jest unit test                      |
| `*.e2e-spec.ts`   | E2E test under `test/`              |
| `*.repository.ts` | Data access abstraction over Prisma |


---

*Last aligned with repository layout and conventions as of the worktree containing this file. When in doubt, mirror an existing module (e.g. `auth` + `user`) and run `pnpm run lint` and `pnpm run test`.*