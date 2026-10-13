# Résumé des Actions Requises - Déploiement Audit 2026-10

## ✅ Phase locale terminée

- ✅ Backend : TypeScript (0 erreur), Lint (warnings non bloquants), tests métier (domains, boundaries, capabilities, sourcing, pricing, readiness) - TOUS PASSÉS
- ✅ Mobile : TypeScript (0 erreur), 83 tests Jest - TOUS PASSÉS
- ✅ Documents de configuration préparés

---

## 📋 Actions restantes

### 1. Configurer les secrets/variables GitHub manquants (9 au total)

**Secrets manquants (5)** :
- [ ] `ADMIN_EMAIL` - Email administrateur
- [ ] `MAINTENANCE_CRON_DISABLED` - Mettre à `true` pour la migration
- [ ] `SENTRY_DSN` - DSN serveur Sentry (optionnel mais recommandé)
- [ ] `DEEPSEEK_API_KEY` - Clé API DeepSeek (IA texte prioritaire)
- [ ] `ALIEXPRESS_RAPIDAPI_KEY` - Clé AliExpress (si utilisé)

**Variables manquantes (4)** :
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - DSN public navigateur Sentry
- [ ] `DEEPSEEK_MODEL` - ID modèle DeepSeek (ex: `deepseek-chat`)
- [ ] `LLM_TEXT_PROVIDER` - `deepseek` pour forcer ce fournisseur
- [ ] `AGENT_WORKER_ENABLED` - `false` (ou `true` après validation capacité machine)

**Où configurer** : GitHub > Settings > Secrets and variables > Actions

**Vérifier après configuration** :
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-github-secrets.ps1 -OwnerRepo "zatouu/itvision"
```

---

### 2. Configurer mobile/app/.env

Créer le fichier `mobile/app/.env` avec :

```dotenv
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=REMPLACER_PAR_LA_CLE_MAPS_RESTREINTE
EXPO_PUBLIC_PROJECT_ID=REMPLACER_PAR_LE_MEME_ID_QUE_LE_PROJET_EAS
EXPO_PUBLIC_SENTRY_DSN=
```

**NOTE** : Ne PAS committer ce fichier (déjà dans .gitignore)

Voir `docs/MOBILE_ENV_TEMPLATE.md` pour les détails.

---

### 3. Sauvegardes pré-déploiement (sur EC2)

```bash
ssh utilisateur@ec2-host
cd ~/itvision

# Sauvegarder MongoDB
docker exec itvision-mongodb mongodump --archive=/tmp/mongo-backup-$(date +%Y%m%d).gz --gzip
docker cp itvision-mongodb:/tmp/mongo-backup-$(date +%Y%m%d).gz /backups/

# Sauvegarder volumes Docker
docker run --rm -v itvision_settings_data:/data -v itvision_uploads_data:/data \
  -v $(pwd)/backups:/backup alpine tar czf /backup/volumes-backup-$(date +%Y%m%d).tar.gz /data

# Sauvegarder .env.ec2
cp .env.ec2 backups/.env.ec2.backup-$(date +%Y%m%d)

# Noter le digest actuel
docker images | grep itvision-app
```

---

### 4. Suspendre les opérations

- [ ] Dans GitHub, définir `MAINTENANCE_CRON_DISABLED=true`
- [ ] Arrêter les workers externes (si applicable)
- [ ] Informer les utilisateurs (optionnel)

---

### 5. Migration tarifs (sur EC2)

```bash
cd ~/itvision

# Puller l'image (après le build GitHub)
export IMAGE=ghcr.io/zatouu/itvision-app@sha256:DIGEST_ICI
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml pull app

# Dry-run
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --dry-run

# Examiner le résultat → si OK, continuer

# Apply
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --apply

# Précontrôle
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/production-preflight.cjs
```

---

### 6. Push sur GitHub et build

```bash
# Sur votre machine locale
git add .
git commit -m "Préparation déploiement audit 2026-10"
git push origin feat/suivi-audit-2026-10
```

Le workflow GitHub Actions exécutera automatiquement :
- Tests de qualité
- Tests E2E
- Tests mobile
- Build Docker image
- Test image sur base jetable

**Surveiller** : GitHub > Actions > Workflows > "Build & Deploy to EC2"

---

### 7. Déploiement manuel via GitHub Actions

Une fois le build passé (image-check OK) :

1. Aller sur GitHub > Actions > Workflows > "Build & Deploy to EC2"
2. Sélectionner la branche "feat/suivi-audit-2026-10"
3. Cliquer sur "Run workflow"
4. Cocher "Autoriser explicitement le déploiement EC2 après validation" (deploy=true)
5. Cliquer sur "Run workflow"

Le workflow va :
- Configurer `.env.ec2` automatiquement sur EC2
- Exécuter le précontrôle production
- Déployer l'image via Docker Compose
- Vérifier la santé de l'application

---

### 8. Recette post-déploiement

```bash
# Sur EC2
curl -f http://localhost:3000/api/health
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f app
```

Tests manuels (via navigateur) :
- [ ] Connexion/déconnexion utilisateur
- [ ] Révocation sessions web (changement mot de passe)
- [ ] OTP SMS (envoi et vérification)
- [ ] Prix admin/client
- [ ] Création commande
- [ ] Paiement PayDunya
- [ ] Création mission Xeuy

---

### 9. Build APK Xeuy

```bash
cd mobile/app
set -a
. ./.env
set +a
npx eas build --platform android --profile audit --non-interactive --no-wait
```

Installer et tester l'APK sur un appareil.

---

### 10. Réactivation des opérations

- [ ] Dans GitHub, définir `MAINTENANCE_CRON_DISABLED=false`
- [ ] Redémarrer les workers externes (si arrêtés)
- [ ] Surveiller les logs pendant 24h

---

## 📁 Documents de référence

- `docs/CHECKLIST_SECRETS_GITHUB.md` - Checklist secrets/variables (avec état actuel)
- `docs/MOBILE_ENV_TEMPLATE.md` - Template configuration mobile
- `docs/GUIDE_DEPLOIEMENT_AUDIT.md` - Guide déploiement étape par étape
- `docs/AUDIT_2026-10.md` - Audit global
- `docs/ENV_DEPLOIEMENT_AUDIT_2026-10.md` - Audit environnement
- `docs/BUILD_AUDIT_2026-10.md` - Guide build

---

## 🎯 Priorité immédiate

1. **Configurer les 9 secrets/variables manquants** dans GitHub
2. **Créer mobile/app/.env** avec la clé Google Maps
3. **Exécuter le script de vérification** pour confirmer

Une fois ces 3 étapes faites, vous pouvez procéder au déploiement complet.
