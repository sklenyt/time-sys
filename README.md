# Depo

Offline-first webová (PWA) aplikace pro časomíru sportovních závodů — funguje z jakéhokoli zařízení a prohlížeče, se síťovou spoluprací mezi stanovišti a živou publikací výsledků.

Monorepo: NestJS + Prisma API (`apps/api`), Vite + React PWA frontend (`apps/web`), sdílené typy (`packages/shared`). Kompletní dokumentace: **[docs/00-index.md](docs/00-index.md)**.

UI mockupy klíčových obrazovek: [docs/07-ui-mockups.md](docs/07-ui-mockups.md) (zdroj v [design/mockups](design/mockups)).

## Vývoj

```bash
npm install
docker compose up -d              # PostgreSQL
npm run build --workspace=@depo/shared
npm run dev:api                   # NestJS API na :3000
npm run dev:web                   # Vite dev server na :5173
```

## Testy

```bash
npm run build --workspace=@depo/shared
npm run test --workspace=apps/api          # unit testy (mockovaný Prisma, bez DB)
npm run test --workspace=apps/web          # unit testy (Vitest)

# e2e testy potřebují reálnou Postgres — proti stejné/jiné instanci než dev DB:
DATABASE_URL="postgresql://depo:depo_dev_password@localhost:5432/depo_test" \
  npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
DATABASE_URL="postgresql://depo:depo_dev_password@localhost:5432/depo_test" \
  npm run test:e2e --workspace=apps/api
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) spouští totéž na každý push/PR proti čerstvému Postgres service containeru — build/lint/typecheck, backendové unit i e2e testy a frontendové unit testy.
