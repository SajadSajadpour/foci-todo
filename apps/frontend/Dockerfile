FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci
COPY apps/frontend apps/frontend
RUN npm run build:frontend

FROM caddy:2-alpine AS runtime
COPY apps/frontend/Caddyfile.local /etc/caddy/Caddyfile.local
COPY apps/frontend/Caddyfile.production /etc/caddy/Caddyfile.production
COPY --from=build /app/apps/frontend/dist /srv
EXPOSE 80 443
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile.local", "--adapter", "caddyfile"]
