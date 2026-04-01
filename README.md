# pbr-hut-backend

Restaurant ordering API — NestJS, Prisma, PostgreSQL.

[![Documentation](https://img.shields.io/badge/documentation-GitHub%20Pages-24292f?style=flat-square&logo=github)](https://shaishab316.github.io/pbr-hut/)

---

## Documentation

Architecture, auth flows, and developer notes live in the **handbook**:

**[shaishab316.github.io/pbr-hut](https://shaishab316.github.io/pbr-hut/)**

---

## Requirements

| Tool   | Version   |
|--------|-----------|
| Node   | ≥ 20      |
| pnpm   | ≥ 10.20   |

---

## Setup

```bash
pnpm install
cp .env.example .env   # configure secrets
pnpm prisma:generate
pnpm start:dev
```

HTTP API is served under `/api/v1`. Interactive OpenAPI is exposed by the running app (see `src/main.ts` / Scalar config).

---

## Scripts

| Command            | Purpose              |
|--------------------|----------------------|
| `pnpm start:dev`   | Dev server (watch)   |
| `pnpm build`       | Compile Nest app     |
| `pnpm test`        | Unit tests           |
| `pnpm docs:dev`    | Handbook (VitePress) |
| `pnpm docs:build`  | Static docs output   |

---

## License

UNLICENSED — see [package.json](./package.json).

---

Maintainer: [@shaishab316](https://github.com/shaishab316)
