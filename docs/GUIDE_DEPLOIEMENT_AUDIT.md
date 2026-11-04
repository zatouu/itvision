# Guide de Déploiement - Audit 2026-10

## État actuel

✅ **Phase locale terminée** :
- Backend : TypeScript (0 erreur), Lint (warnings non bloquants), tests métier (domains, boundaries, capabilities, sourcing, pricing, readiness) - TOUS PASSÉS
- Mobile : TypeScript (0 erreur), 83 tests Jest - TOUS PASSÉS
- Documents de configuration préparés :
  - `CHECKLIST_SECRETS_GITHUB.md` - Tous les secrets/variables GitHub à configurer
  - `MOBILE_ENV_TEMPLATE.md` - Template pour configuration mobile

---

## Prérequis pour le déploiement

1. **Accès GitHub** : Configurer tous les secrets/variables selon `CHECKLIST_SECRETS_GITHUB.md`
2. **Accès EC2** : SSH au serveur de production
3. **Configuration mobile** : Créer `mobile/app/.env` avec la clé Google Maps (voir `MOBILE_ENV_TEMPLATE.md`)
4. **Docker & Compose** : Installés sur EC2
5. **MongoDB** : Replica set avec primaire disponible
6. **Redis** : Accessible depuis le réseau Compose

---

## ÉTAPE 1 : Sauvegardes Pré-Déploiement

### Sur le serveur EC2

```bash
# Se connecter au serveur
ssh utilisateur@ec2-host

# Naviguer vers le dossier du projet
cd ~/itvision

# 1. Sauvegarder MongoDB
docker exec itvision-mongodb mongodump --archive=/tmp/mongo-backup-$(date +%Y%m%d).gz --gzip

# Copier la sauvegarde hors du conteneur
docker cp itvision-mongodb:/tmp/mongo-backup-$(date +%Y%m%d).gz /backups/

# 2. Sauvegarder les volumes Docker
docker run --rm -v itvision_settings_data:/data -v itvision_uploads_data:/data \
  -v $(pwd)/backups:/backup alpine tar czf /backup/volumes-backup-$(date +%Y%m%d).tar.gz /data

# 3. Sauvegarder le fichier .env.ec2 (existant)
cp .env.ec2 backups/.env.ec2.backup-$(date +%Y%m%d)

# 4. Noter le digest de l'image actuellement déployée
docker images | grep itvision-app
# Notez le digest (ex: sha256:abc123...)
```

**Conserver ces sauvegardes hors du dépôt.**

**NOTE** : Le workflow GitHub Actions va régénérer `.env.ec2` automatiquement lors du déploiement. C'est normal et voulu.

---

## ÉTAPE 2 : Suspendre les opérations

```bash
# 1. Activer le mode maintenance
# Dans GitHub, définir MAINTENANCE_CRON_DISABLED=true

# 2. Suspendre les workers externes (si applicable)
# Arrêter les workers qui pourraient modifier les données pendant la migration

# 3. Informer les utilisateurs (optionnel)
# Afficher une bannière maintenance sur le site
```

---

## ÉTAPE 3 : Migration Tarifs (Dry-Run sur EC2)

```bash
# Sur le serveur EC2, dans le dossier ~/itvision

# 1. Exporter le digest de l'image à déployer
# (Obtenir le digest depuis GitHub Actions après le build)
export IMAGE=ghcr.io/zatouu/itvision-app@sha256:DIGEST_ICI

# 2. Puller l'image
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml pull app

# 3. Exécuter la migration en dry-run
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --dry-run
```

**EXAMINER LE RÉSULTAT** :
- Si des fichiers tarifaires attendus manquent et que des valeurs par défaut apparaissent → **ARRÊTER** et retrouver la bonne source
- Si le dry-run montre les bonnes valeurs → **CONTINUER**

---

## ÉTAPE 4 : Migration Tarifs (Apply sur EC2)

```bash
# Après validation du dry-run

# 1. Appliquer la migration
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --apply

# 2. Exécuter le précontrôle production
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/production-preflight.cjs
```

**Le précontrôle vérifie** :
- Présence des secrets requis
- Mongo primaire disponible
- Redis accessible
- Validité des deux blocs tarifaires

**Si échec** : Corriger les problèmes avant de continuer.

---

## ÉTAPE 5 : Push sur GitHub et Build

```bash
# Sur votre machine locale

# 1. Commiter les changements (si nécessaire)
git add .
git commit -m "Préparation déploiement audit 2026-10"

# 2. Pusher sur la branche feat/suivi-audit-2026-10
git push origin feat/suivi-audit-2026-10
```

Le workflow GitHub Actions va automatiquement :
- Exécuter les tests de qualité (type-check, domains, boundaries, capabilities, sourcing, pricing, readiness)
- Exécuter les tests E2E marketplace et corporate
- Exécuter les tests mobile
- Builder l'image Docker ARM64
- Tester l'image sur une base jetable
- **Mais NE PAS déployer automatiquement** (la branche audit nécessite un workflow_dispatch manuel)

---

## ÉTAPE 6 : Déploiement Manuel via GitHub Actions

```bash
# Une fois le build terminé et l'image validée (image-check passé)

# 1. Aller sur GitHub > Actions > Workflows > "Build & Deploy to EC2"
# 2. Sélectionner la branche "feat/suivi-audit-2026-10"
# 3. Cliquer sur "Run workflow"
# 4. Cocher "Autoriser explicitement le déploiement EC2 après validation" (deploy=true)
# 5. Cliquer sur "Run workflow"
```

Le workflow va :
- Configurer automatiquement `.env.ec2` sur EC2 avec tous les secrets GitHub
- Exécuter le précontrôle production sur EC2
- Puller l'image et déployer via Docker Compose
- Vérifier la santé de l'application

**NOTE** : La migration tarifs doit être faite manuellement (étapes 3-4) AVANT ou APRÈS le déploiement, selon votre préférence. Le workflow ne l'exécute pas automatiquement.

---

## ÉTAPE 7 : Recette Post-Déploiement

### Contrôles automatiques

```bash
# Sur le serveur EC2

# 1. Contrôle HTTP
curl -f http://localhost:3000/api/health
# Devrait retourner 200

# 2. Vérifier les logs
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f app
# Ctrl+C pour arrêter la surveillance des logs
```

### Contrôles manuels (via navigateur)

Tester sur deux appareils :

1. **Connexion** :
   - [ ] Connexion utilisateur fonctionne
   - [ ] Déconnexion fonctionne
   - [ ] Révocation des sessions web après changement de mot de passe

2. **OTP (Xeuy)** :
   - [ ] Envoi SMS OTP fonctionne
   - [ ] Vérification code OTP fonctionne
   - [ ] Codes de test ne fonctionnent PAS en production

3. **Prix** :
   - [ ] Prix admin affichés correctement
   - [ ] Prix client affichés correctement
   - [ ] Calcul des frais de transport fonctionne

4. **Commande** :
   - [ ] Création de commande fonctionne
   - [ ] Panier persiste
   - [ ] Variantes produits sélectionnées correctement

5. **Paiement** :
   - [ ] Intégration PayDunya fonctionne
   - [ ] Webhooks reçus
   - [ ] Anti-double-paiement actif

6. **Mission (Xeuy)** :
   - [ ] Création de mission fonctionne
   - [ ] Paiement mission fonctionne

---

## ÉTAPE 8 : Build APK Xeuy (Profil Audit)

### Sur la machine de développement

```bash
# 1. Naviguer vers mobile/app
cd mobile/app

# 2. Charger les variables d'environnement
set -a
. ./.env
set +a

# 3. Vérifier que la clé Maps est définie
: "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:?Cle Maps requise}"

# 4. Build APK
npx eas build --platform android --profile audit --non-interactive --no-wait

# 5. Suivre le build sur l'interface EAS
# Télécharger l'APK une fois terminé
```

### Installation et test

```bash
# Installer l'APK sur un appareil de test
adb install xeuy-audit.apk

# Tester les parcours clés :
# - Connexion OTP
# - Carte et géolocalisation
# - Création de mission
# - Paiement
```

---

## ÉTAPE 9 : Réactivation des opérations

```bash
# 1. Réactiver les crons
# Dans GitHub > Settings > Secrets and variables > Actions
# Modifier MAINTENANCE_CRON_DISABLED à false

# 2. Redémarrer les workers externes (si arrêtés)

# 3. Surveiller les logs pendant 24h
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f app
```

---

## Rollback (si nécessaire)

Si un problème critique est détecté :

### Option 1 : Rollback via GitHub Actions (recommandé)

```bash
# 1. Aller sur GitHub > Actions > Workflows > "Build & Deploy to EC2"
# 2. Sélectionner la branche précédente (ex: main ou un tag de version)
# 3. Cliquer sur "Run workflow" avec deploy=true
```

### Option 2 : Rollback manuel sur EC2

```bash
# Sur le serveur EC2

# 1. Arrêter les services
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml down

# 2. Restaurer l'image précédente
export IMAGE=ghcr.io/zatouu/itvision-app@sha256:ANCIEN_DIGEST
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml pull app

# 3. Restaurer .env.ec2 si nécessaire
cp backups/.env.ec2.backup-DATE .env.ec2

# 4. Redémarrer
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d

# 5. Restaurer MongoDB si nécessaire (DERNIER RECOURS)
docker exec -i itvision-mongodb mongorestore --archive=/tmp/mongo-backup-DATE.gz --gzip
```

**NOTE** : Revenir à un ancien code lisant les fichiers tarifaires demande une reconciliation avec les tarifs Mongo. Aucun rollback de données automatique n'est prévu.

---

## Checklist finale

- [ ] Tous les secrets GitHub configurés (voir CHECKLIST_SECRETS_GITHUB.md)
- [ ] `mobile/app/.env` créé avec la clé Google Maps
- [ ] Sauvegardes effectuées et stockées hors dépôt
- [ ] MAINTENANCE_CRON_DISABLED=true activé dans GitHub
- [ ] Migration tarifs dry-run examinée et validée sur EC2
- [ ] Migration tarifs apply exécutée sur EC2
- [ ] Précontrôle production passé sur EC2
- [ ] Code pushé sur feat/suivi-audit-2026-10
- [ ] Build GitHub Actions passé (quality, e2e, mobile-quality, build, image-check)
- [ ] Déploiement manuel via GitHub Actions (workflow_dispatch avec deploy=true)
- [ ] Contrôles HTTP et logs OK
- [ ] Recette manuelle complète (connexion, OTP, prix, commande, paiement, mission)
- [ ] APK Xeuy audit buildé et testé
- [ ] MAINTENANCE_CRON_DISABLED=false réactivé dans GitHub
- [ ] Logs surveillés pendant 24h sans anomalie

---

## Documents de référence

- [Audit global](AUDIT_2026-10.md)
- [Audit environnement](ENV_DEPLOIEMENT_AUDIT_2026-10.md)
- [Guide build](BUILD_AUDIT_2026-10.md)
- [Checklist secrets](CHECKLIST_SECRETS_GITHUB.md)
- [Template mobile](MOBILE_ENV_TEMPLATE.md)
- [Workflow GitHub](../.github/workflows/deploy-ghcr-ec2.yml)
- [Compose EC2](../docker-compose.ec2.yml)
