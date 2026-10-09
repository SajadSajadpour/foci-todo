FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --ignore-scripts
COPY apps/backend apps/backend
RUN npm run build:backend

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/drizzle apps/backend/drizzle
WORKDIR /app/apps/backend
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
