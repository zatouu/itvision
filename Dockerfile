# Dockerfile pour l'application Next.js securite-electronique
FROM node:20-alpine AS base

# Installation des dépendances système nécessaires
RUN apk add --no-cache libc6-compat

# Étape 1: Installation des dépendances
FROM base AS deps
WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json* ./

# Installation des dépendances (inclure dev pour le build)
RUN npm ci && npm cache clean --force

# Étape 2: Build de l'application
FROM base AS builder
WORKDIR /app

# Copie des dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build de l'application
RUN npm run build

# Étape 3: Image de production
FROM base AS runner
WORKDIR /app

# Création d'un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Outils nécessaires pour les healthchecks (utilisés par docker-compose)
RUN apk add --no-cache curl wget

# Copie des fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Création des dossiers pour les uploads
RUN mkdir -p ./public/uploads
RUN chown -R nextjs:nodejs ./public/uploads

# Configuration des permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Variables d'environnement
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

# Exposition du port
EXPOSE 3000

# Healthcheck interne (en complément de celui dans docker-compose)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]