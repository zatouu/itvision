# IT Vision Plus — Application Next.js

## Aperçu
Application web Next.js (React + TypeScript) avec API routes, MongoDB (mongoose) et Prisma (optionnel). Docker/Compose et Nginx inclus pour un déploiement simple.

## Prérequis
- Node.js 18+ et npm, ou Docker + Docker Compose
- Base de données MongoDB accessible (ou utiliser le service MongoDB du docker-compose)

## Variables d'environnement
Créer un fichier `.env.local` (local) ou `.env.production` (prod) contenant au minimum:
```
# Base Mongo (requis)
MONGODB_URI=mongodb://user:password@host:27017/itvision_db

# Auth & sécurité (requis)
NEXTAUTH_SECRET=change-me
NEXTAUTH_URL=https://votre-domaine
JWT_SECRET=change-me-aussi

# Public
NEXT_PUBLIC_SITE_URL=https://votre-domaine
NEXT_PUBLIC_API_URL=https://votre-domaine

# Uploads
UPLOAD_DIR=./public/uploads

# Prisma (optionnel, uniquement si vous utilisez les routes Prisma)
# Exemple SQLite: DATABASE_URL=file:./prisma/dev.db
# Exemple Postgres: DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_URL=
```

## Utilisation en local (sans Docker)
```bash
npm install
# (optionnel) npx prisma generate && npx prisma db push
npm run dev
# Production
npm run build
npm run start
```

## Utilisation avec Docker Compose (recommandé)
1) Créez un fichier `.env.docker` à la racine:
```
MONGO_ROOT_PASSWORD=ChangeMeRoot!
MONGO_APP_PASSWORD=ChangeMeApp!
NEXTAUTH_SECRET=ChangeMeSuperSecret
NEXTAUTH_URL=http://localhost
JWT_SECRET=AnotherSecret
NEXT_PUBLIC_SITE_URL=http://localhost
NEXT_PUBLIC_API_URL=http://localhost
```
2) Lancez:
```bash
docker compose --env-file .env.docker up -d --build
# Logs
docker compose --env-file .env.docker logs -f app
```
L'application écoute sur le port 3000 derrière Nginx (80). Fichiers uploadés: `public/uploads` (volume persistant configuré).

## Déploiement sur AWS EC2 (guide rapide)
- Créez une instance Ubuntu 22.04/24.04 (t3.small conseillé), ouvrez les ports 22, 80, 443.
- Installez Docker et Compose:
```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```
- Déployez l'application sur l'instance:
```bash
# Copier le code sur l'instance (via git clone ou scp), puis
cd /path/to/app
# Créer .env.docker avec vos valeurs (domaine, secrets, mots de passe)
vi .env.docker
# Démarrer
docker compose --env-file .env.docker up -d --build
```
- DNS: Pointez un enregistrement A `app.votre-domaine` vers l'IP publique EC2.
- HTTPS (option rapide):
```bash
# Obtenir un certificat Let's Encrypt (webroot via certbot du compose)
docker compose run --rm --entrypoint "" certbot \
  sh -lc "certbot certonly --agree-tos --email admin@votre-domaine \
  --webroot -w /var/www/certbot -d app.votre-domaine"
# Activez le bloc HTTPS dans docker/nginx/default.conf (décommenter) puis
docker compose restart nginx
```
- Mise à jour:
```bash
git pull && docker compose --env-file .env.docker up -d --build
```

## Dossiers importants
- `src/` code application (pages, API, composants)
- `docker/` Nginx et Mongo init
- `docker-compose.yml` orchestration (Mongo, app, Nginx, certbot)
- `Dockerfile` build image Next.js (standalone)
- `prisma/` schéma Prisma (optionnel)

## Scripts npm utiles
```bash
npm run dev    # dev
npm run build  # build prod
npm run start  # start prod
npm run lint   # lint
```
