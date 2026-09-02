# Dockerfile pour l'application Next.js IT Vision (standalone)
# Utilise node:20-slim (Debian) pour supporter Playwright + Chromium
FROM node:20-slim AS base

# Étape 1: Installation des dépendances
FROM base AS deps
WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json* ./

# Installation des dépendances (inclure dev pour le build)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Installer le navigateur Chromium de Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Étape 2: Build de l'application
FROM base AS builder
WORKDIR /app

# Copie des dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Mémoire augmentée pour le build Next.js (évite les stalls)
ENV NODE_OPTIONS=--max-old-space-size=4096
# Placeholder uniquement pour permettre le build Next.js (pas utilisé à l'exécution)
ENV MONGODB_URI=mongodb://localhost:27017/build-placeholder

# Build de l'application (output: standalone dans next.config.mjs)
RUN npm run build

# Étape 3: Image de production (standalone — node_modules minimal tracé par Next.js)
FROM base AS runner
WORKDIR /app

# Dépendances système pour Chromium + outils
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget ca-certificates \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-noto-cjk fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

# Création d'un utilisateur non-root
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copie du standalone (inclut node_modules minimal + server.js tracé par Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Fichiers statiques non inclus dans standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Assets publics
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# lib/ requis par server.js (redis-geo) — inclut ioredis via outputFileTracingIncludes
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Copier Playwright + Chromium depuis l'étape deps
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=deps --chown=nextjs:nodejs /ms-playwright /ms-playwright

# Dossier pour les uploads
RUN mkdir -p ./public/uploads
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /ms-playwright
USER nextjs

# Variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Exposition du port
EXPOSE 3000

# Healthcheck interne
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]