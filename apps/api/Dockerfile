# Vícestupňový build pro npm workspaces monorepo — zrcadlí přesně tu
# samou sekvenci, kterou používá .github/workflows/ci.yml (npm ci → build
# @depo/shared → prisma generate → build @depo/api), aby se produkční
# image nechoval jinak než to, co už prochází CI.
#
# Stavěno a testováno bez Docker daemonu po ruce (sandboxované prostředí
# session) — ověřit `docker build` lokálně před prvním ostrým nasazením.

FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build --workspace=@depo/shared
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=@depo/api
# Odstranit devDependencies (typescript, @nestjs/cli, ts-jest, ...) z
# node_modules, které se kopírují do runtime stage — vygenerovaný
# Prisma Client v node_modules/.prisma zůstává, ten prune nemaže.
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
# Schéma/migrace zůstávají v image, aby šlo `prisma migrate deploy`
# spustit i jako jednorázový příkaz nad stejným image (docs/15-produkcni-nasazeni.md
# §15.3) — appka samotná při startu migrace nikdy nespouští.
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
