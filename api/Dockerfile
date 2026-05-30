# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.22.1

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV CI=true
RUN apt-get update && \
    apt-get install -y openssl

FROM base AS deps
COPY package*.json ./
RUN npm install --ignore-scripts --no-audit --no-fund

FROM deps AS build
COPY tsconfig*.json nest-cli.json eslint.config.mjs prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM base AS prod-deps
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm install --omit=dev --no-save prisma@7.8.0 --no-audit --no-fund

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:deploy && node dist/src/main"]
