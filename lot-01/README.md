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

# Import catalogue (AliExpress via RapidAPI)
# ALIEXPRESS_RAPIDAPI_KEY=your-rapidapi-key
# ALIEXPRESS_USD_TO_XOF=620           # optionnel, taux de conversion USD→FCFA
# ALIEXPRESS_DEFAULT_MARGIN=30        # optionnel, marge (%) appliquée

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
npm run dev           # dev
npm run build         # build prod
npm run start         # start prod
npm run lint          # lint
npm run test:features # tester les nouvelles fonctionnalités
npm run import:aliexpress -- --keyword "hikvision" --limit 5 --dry-run # importer des fiches AliExpress (dry-run)
```

### Import catalogue AliExpress

#### Interface Web (Recommandé)

**Option 1 : Apify (Recommandé)**
1. Créez un compte sur [Apify](https://apify.com) (plan gratuit avec 5$ de crédit/mois).
2. Récupérez votre clé API dans les paramètres.
3. Ajoutez dans `.env` :
   ```env
   APIFY_API_KEY=votre-cle-apify
   IMPORT_SOURCE=apify
   ```
4. Accédez à `/admin/import-produits` depuis l'interface admin.
5. Utilisez la recherche par mot-clé pour trouver des produits sur AliExpress.

**Option 2 : RapidAPI**
1. Créez un compte RapidAPI et souscrivez à une API AliExpress (ex. *aliexpress-datahub*).
2. Ajoutez dans `.env` :
   ```env
   ALIEXPRESS_RAPIDAPI_KEY=votre-cle-rapidapi
   IMPORT_SOURCE=rapidapi
   ```
3. Accédez à `/admin/import-produits` depuis l'interface admin.

**Utilisation :**
- Utilisez la recherche par mot-clé pour trouver des produits.
- Cliquez sur "Importer" pour chaque produit souhaité, ou "Tout importer" pour importer tous les résultats.
- Les produits sont automatiquement créés avec les informations AliExpress (prix, images, caractéristiques).

#### Ligne de commande
1. Lancez un import de test (dry-run) :
   ```bash
   ALIEXPRESS_RAPIDAPI_KEY=xxx npm run import:aliexpress -- --keyword "caméra hikvision" --limit 10 --dry-run
   ```
2. Retirez `--dry-run` pour créer ou mettre à jour les produits.

📘 Documentation complète : voir [`ALIEXPRESS_IMPORT.md`](./ALIEXPRESS_IMPORT.md).

## 🆕 Nouvelles Fonctionnalités

### ✅ v1.4 - Hub Admin & Portails synchronisés (Dernière)
- **Tableau de bord admin repensé** : carte KPI responsive, actions rapides et accès directs aux portails clients/techniciens.
- **Synchronisation clients ↔ techniciens** : l’API `GET /api/tech/clients` expose un annuaire filtré (sans données sensibles) partageable avec le portail terrain.
- **Annuaire technicien enrichi** : les techniciens voient immédiatement les nouveaux clients, avec coordonnées, contrats actifs et CTA de planification.
- **Suivi portails** : compteurs globaux (clients actifs, accès portail client, techniciens disponibles) pour monitorer la relation back-office ↔ terrain ↔ client.
- **Support tickets V2** : centre support client (`/client-portal`) et dashboard admin (`/admin/tickets`) avec fil de discussion, suivi SLA et affectation.

### ✅ v1.3 - Système de Réservation Avancé
- **Emails de confirmation** : Templates professionnels pour les RDV
- **Calendrier intégré** : Interface de réservation améliorée avec créneaux visuels
- **Multi-canal** : WhatsApp + Email + SMS + Fichiers .ics
- **Notifications admin** : Alertes automatiques pour nouveaux RDV

### ✅ v1.2 - Fonctionnalités Avancées
- **Gestion des utilisateurs** : Interface complète `/admin/users`
- **Notifications temps réel** : Centre de notifications avec API
- **Analytics avancés** : Métriques business et insights
- **Dashboard admin enrichi** : Navigation et composants améliorés

### ✅ v1.1 - Authentification Complète
- **Reset de mot de passe** : Pages `/forgot-password` et `/reset-password`
- **Inscription utilisateur** : Page `/register` avec validation avancée
- **Service d'email** : Templates professionnels avec support SMTP
- **Sécurité renforcée** : Validation de mots de passe, rate limiting

### 📱 Pages Disponibles
#### Authentification
- `/login` - Connexion unifiée
- `/register` - Inscription utilisateur
- `/forgot-password` - Demande de reset
- `/reset-password` - Réinitialisation avec token

#### Administration
- `/admin-reports` - Dashboard principal (avec notifications et analytics)
- `/admin/users` - Gestion complète des utilisateurs
- `/admin-prix` - Gestion des prix et produits
- `/admin-factures` - Gestion des factures

### 📧 Configuration Email
Pour activer l'envoi d'emails, ajouter dans `.env.local` :
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 📚 Documentation
- `NOUVELLES_FONCTIONNALITES.md` - Fonctionnalités v1.1 (authentification)
- `AMELIORATIONS_AVANCEES.md` - Fonctionnalités v1.2 (administration)
- `AMELIORATIONS_RESERVATION.md` - Fonctionnalités v1.3 (réservation)
- `SUPPORT_TICKETS.md` - Architecture et microservice potentiel pour le module support
