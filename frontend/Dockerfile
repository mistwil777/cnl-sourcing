# ─── Stage 1 : builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dépendances d'abord (couche cachée si package.json inchangé)
COPY package.json package-lock.json ./
RUN npm ci

# Code source
COPY . .

# Build standalone (génère .next/standalone/server.js)
RUN npm run build

# ─── Stage 2 : runner ─────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12 AS runner

WORKDIR /app

# Copie uniquement le nécessaire depuis le builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

EXPOSE 3000

CMD ["server.js"]
