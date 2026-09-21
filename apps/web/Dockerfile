# Vícestupňový build — statický výstup (Vite) servírovaný přes nginx.
# `VITE_API_URL` se do appky zapéká PŘI BUILDU (Vite nahrazuje
# `import.meta.env.*` v kódu za konkrétní řetězec), ne za běhu kontejneru —
# zadat proto přes --build-arg, ne přes `environment:` v compose:
#   docker build --build-arg VITE_API_URL=https://api.tvuj-domena.cz -t depo-web apps/web -f apps/web/Dockerfile .
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
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build --workspace=@depo/shared
RUN npm run build --workspace=@depo/web

FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
