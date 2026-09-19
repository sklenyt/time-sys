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
