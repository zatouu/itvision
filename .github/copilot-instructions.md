## Objectif
Fournir aux agents IA les éléments essentiels pour être productifs rapidement dans ce dépôt Next.js + Node (temps réel) + MongoDB.

## Vue d'ensemble (big picture)
- Application Next.js (frontend + API routes) servie par `server.js` qui démarre Next et un serveur `socket.io` pour le temps réel.
- Persistance principale: MongoDB (conteneur `mongodb` dans `docker-compose.yml`) via `mongoose`. `prisma/` existe mais est optionnel (SQLite/Postgres si utilisé).
- Reverse-proxy et SSL : `docker/nginx/*` + `docker-compose.yml` + `certbot` service.

## Points d'intégration critiques
- Socket temps réel: `server.js` — logique d'authentification JWT (utilise `jose`), rooms nommées `user-<id>`, `ticket-<id>`, `project-<id>`. `global.io` est exposé pour réutilisation dans les API routes.
- Middleware d'application: `src/middleware.ts` — contrôle des routes publiques/protégées, mapping des rôles (`ADMIN`, `CLIENT`, `TECHNICIAN`), et headers de sécurité.
- Schéma de données: `prisma/schema.prisma` documente les modèles principaux (User, Project, MaintenanceReport...). Même si Prisma est optionnel, la structure reflète les entités du système.
- Uploads: dossier persistant `public/uploads` (monté par Docker, voir `docker-compose.yml`).

## Commandes et workflows importants
- Développement local (sans Docker): `npm install` puis `npm run dev` (dev server démarré via `node server.js`).
- Build + production: `npm run build` puis `npm run start` (ou `npm run start:next`).
- Docker (recommandé pour reproduire l'environnement):
  - Créer `.env.docker` (exemples et variables documentées dans `README.md`).
  - Lancer: `docker compose --env-file .env.docker up -d --build`.
- Scripts utiles:
  - `npm run db:generate|db:push|db:migrate` (Prisma)
  - `npm run seed:admin` / `npm run create:admin` (création d'admin)
  - `npm run import:aliexpress` (import catalogue, voir `ALIEXPRESS_IMPORT.md`)
  - `npm run test:features` (script de tests de fonctionnalités)

## CI/CD & Releases
- CI: des workflows GitHub Actions sont présents dans `.github/workflows/` (ex. `deploy.yml`, `deploy-ghcr-ec2.yml`). Ils construisent et publient des images sur GitHub Container Registry (GHCR) et déploient sur des cibles (EC2/Nginx).
- CI: des workflows GitHub Actions sont présents dans `.github/workflows/` (ex. `deploy.yml`, `deploy-ghcr-ec2.yml`). Ils construisent et publient des images sur GitHub Container Registry (GHCR) et déploient sur des cibles (EC2/Nginx).
- Images: la build produit des images publiées sur GHCR; vérifier les secrets `GHCR_TOKEN` / `DOCKER_USERNAME` / `DOCKER_PASSWORD` dans les secrets du repo pour push automatique.
- Déclencheurs: les workflows sont typiquement déclenchés sur `push` vers la branche par défaut (`main`) ou via `workflow_dispatch` pour déploiements manuels.
- Pour reproduire localement la même image (same Dockerfile):
  ```bash
  docker build -t ghcr.io/<owner>/<repo>:<tag> .
  docker login ghcr.io -u <owner> -p $GHCR_TOKEN
  docker push ghcr.io/<owner>/<repo>:<tag>
  ```

Consultez `.github/workflows/` pour les détails et adaptez les secrets avant d'ajouter de nouveaux workflows.

Consultez `.github/workflows/` pour les détails et adaptez les secrets avant d'ajouter de nouveaux workflows.

- Workflow spécifique: `Build & Deploy to EC2 (GHCR + Compose)` — fichier: `.github/workflows/deploy-ghcr-ec2.yml`.
  - Triggers: `push` sur `main` et `cursor/*`, et `workflow_dispatch` (exécution manuelle).
  - Étapes clés:
    - Build & push: utilise `docker/metadata-action`, `docker/setup-buildx-action` et `docker/build-push-action` pour construire et pousser l'image sur `ghcr.io/${{ github.repository }}`.
    - Deploy: prépare la clé SSH, copie `docker-compose.ec2.yml` et `docker/mongodb/init.js` sur l'hôte EC2, crée un fichier `.env.ec2` à partir des secrets, se connecte à GHCR depuis l'EC2, pull l'image (retry) et exécute `docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d`.
  - Secrets/variables GitHub utilisés (doivent être définis dans Settings → Secrets):
    - `SSH_KEY`, `SSH_HOST`, `SSH_USER` — accès SSH vers l'EC2.
    - `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD` — mots de passe Mongo init/config.
    - `NEXTAUTH_SECRET`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL` — variables d'application injectées dans `.env.ec2`.
    - `GHCR_TOKEN`, `GHCR_USERNAME` — authentification pour pull/push sur GHCR (le workflow utilise aussi `GITHUB_TOKEN` pour certains steps).
  - Remarques opérationnelles:
    - Les secrets sont attendus dans les Secrets GitHub (repo/organization). Le workflow écrit `.env.ec2` côté EC2 en injectant ces secrets dans le fichier.
    - Le login GHCR sur l'EC2 est fait via `echo "$GHCR_TOKEN" | docker login ghcr.io -u $GHCR_USERNAME --password-stdin`.
    - Le déploiement inclut des étapes d'installation de Docker/Compose côté EC2 si nécessaire et une stratégie de retry pour le `docker pull`.

Vérifiez `.github/workflows/deploy-ghcr-ec2.yml` avant d'ajouter/modifier des secrets ou étapes d'authentification.

## Conventions et patterns spécifiques
- Auth: JWT partagé entre `server.js` (sockets) et `src/middleware.ts` (pages/routes). Utiliser la variable d'environnement `JWT_SECRET` (TextEncoder(secret)).
- Rôles: toujours en MAJUSCULE (`CLIENT`, `TECHNICIAN`, `ADMIN`, `SUPER_ADMIN`), vérifiés par la middleware.
- RSocket rooms: conventions de nommage prévisibles — utilisez `user-<userId>`, `ticket-<ticketId>`, `project-<projectId>` pour adresser des messages.
- API routes et pages: routes publiques listées dans `src/middleware.ts` (ex. `/login`, `/register`, `/api/health`). Respectez ces préfixes pour le contrôle d'accès.
- Sécurité: entêtes CSP et autres headers appliqués globalement (voir `next.config.mjs` et `src/middleware.ts`). Ne supprimer/modifier qu'avec attention.

## Fichiers à consulter en priorité
- `server.js` — point d'entrée et logique Socket.io
- `src/middleware.ts` — auth, rôles, sécurité et matcher
- `prisma/schema.prisma` — modèle des données (référence)
- `docker-compose.yml` & `docker/nginx/*` — orchestration & reverse-proxy
- `scripts/` — utilitaires (seed, import, fix-eslint, etc.)
- `README.md` — procédures d'installation et variables `.env` recommandées

## Exemples rapides (à copier)
- Émettre à un ticket via socket depuis le serveur/API:
  - Room: `ticket-1234`
  - `global.io.to('ticket-1234').emit('new-message', payload)`
- Démarrer en dev (local):
  - `npm install`
  - `npm run dev`

## Limitations et choses à vérifier
- Prisma est présent mais la base de production utilise MongoDB + `mongoose` — vérifiez avant d'ajouter des migrations Prisma en prod.
- Les secrets (`JWT_SECRET`, `NEXTAUTH_SECRET`, `MONGODB_URI`) sont obligatoires en prod.
- ESLint est désactivé pendant la build (`next.config.mjs`), mais le repo contient des scripts de lint/formatting — conservez-les.

## Que demander si incertain
- Quel est l'endpoint API attendu pour cette fonctionnalité (ex: `/api/tickets` vs socket)?
- Utiliser Mongo (`mongoose`) ou Prisma pour persister ce nouveau modèle?
- Faut-il publier l'événement socket pour tous les utilisateurs ou uniquement aux rooms spécifiques (`user-`, `ticket-`, `project-`)?

---
Merci — je peux itérer sur cette instruction si vous souhaitez plus de détails sur les workflows CI/CD, tests ou guidelines de contribution.
