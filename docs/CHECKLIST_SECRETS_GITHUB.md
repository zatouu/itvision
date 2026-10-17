# Checklist des Secrets et Variables GitHub - Déploiement Audit 2026-10

## Instructions

Ce document liste TOUS les secrets et variables à configurer dans GitHub avant le déploiement.
Cochez chaque élément une fois configuré.

**IMPORTANT** :
- Les **Secrets** sont lus via `secrets.NOM` dans le workflow
- Les **Variables** sont lues via `vars.NOM`
- Un Secret du même nom ne remplace PAS une Variable

**NOTE** : Le workflow `deploy-ghcr-ec2.yml` configure AUTOMATIQUEMENT le fichier `.env.ec2` sur EC2 avec ces valeurs. Vous n'avez PAS besoin de créer `.env.ec2` manuellement sur le serveur.

---

## État actuel (vérifié le 12 octobre 2026)

✅ **36/41 secrets configurés**
❌ **5 secrets manquants** (voir ci-dessous)
❌ **4/4 variables manquantes** (toutes à configurer)

Pour vérifier à nouveau :
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-github-secrets.ps1 -OwnerRepo "zatouu/itvision"
```

---

---

## GitHub Secrets (obligatoires)

**ÉTAT ACTUEL : 36/41 configurés**

### Accès EC2
- [x] `SSH_HOST` - Hôte EC2 accessible depuis le runner ✅ **DÉJÀ CONFIGURÉ**
- [x] `SSH_USER` - Compte de déploiement avec droits Docker/services ✅ **DÉJÀ CONFIGURÉ**
- [x] `SSH_KEY` - Clé privée du compte (jamais dans les sources) ✅ **DÉJÀ CONFIGURÉ**

### MongoDB
- [x] `MONGO_ROOT_PASSWORD` - Mot de passe root Mongo existant ✅ **DÉJÀ CONFIGURÉ**
- [x] `MONGO_APP_PASSWORD` - Mot de passe utilisateur `itvision_app` (interpôle l'URI) ✅ **DÉJÀ CONFIGURÉ**

### Authentification & Sessions
- [x] `JWT_SECRET` - Secret signeur (identique sur toutes instances Next/Socket.io/workers) ✅ **DÉJÀ CONFIGURÉ**
- [x] `NEXTAUTH_SECRET` - Secret NextAuth (stable entre instances) ✅ **DÉJÀ CONFIGURÉ**
- [x] `CRON_SECRET` - Secret appels internes/cron (même valeur chez appelants) ✅ **DÉJÀ CONFIGURÉ**

### Site & URLs
- [x] `NEXT_PUBLIC_SITE_URL` - URL HTTPS du site : `https://itvisionplus.sn` (sans chemin) ✅ **DÉJÀ CONFIGURÉ**

### Redis
- [x] `REDIS_URL` - URI Redis (ou vide pour repli Compose `redis://redis:6379`) ✅ **DÉJÀ CONFIGURÉ**

### SMS / OTP (Xeuy)
- [x] `SMS_PROVIDER` - `twilio` pour le chemin SMS configuré ✅ **DÉJÀ CONFIGURÉ**
- [x] `TWILIO_ACCOUNT_SID` - SID compte autorisé ✅ **DÉJÀ CONFIGURÉ**
- [x] `TWILIO_AUTH_TOKEN` - Jeton privé Twilio ✅ **DÉJÀ CONFIGURÉ**
- [x] `TWILIO_FROM_NUMBER` - Numéro expéditeur (format international) ✅ **DÉJÀ CONFIGURÉ**
- [x] `OTP_TEST_PHONES` - Vide pour fonctionnement normal (whitelist de test uniquement) ✅ **DÉJÀ CONFIGURÉ**
- [x] `ALLOW_TEST_CODES` - **DEJA force à false dans Compose** (ne pas activer en production) ✅ **DÉJÀ CONFIGURÉ**

### Paiement DDM+
- [x] `PAYMENTS_MOCK` - `false` pour paiements réels ✅ **DÉJÀ CONFIGURÉ**
- [x] `PAYDUNYA_MASTER_KEY` - Master key PayDunya ✅ **DÉJÀ CONFIGURÉ**
- [x] `PAYDUNYA_PRIVATE_KEY` - Private key PayDunya ✅ **DÉJÀ CONFIGURÉ**
- [x] `PAYDUNYA_TOKEN` - Token PayDunya ✅ **DÉJÀ CONFIGURÉ**
- [x] `PAYDUNYA_MODE` - Mode du prestataire (test/production) ✅ **DÉJÀ CONFIGURÉ**
- [x] `PAYDUNYA_STORE_NAME` - Nom marchand affiché ✅ **DÉJÀ CONFIGURÉ**
- [x] `WAVE_PAY_URL` - URL paiement Wave (si utilisé) ✅ **DÉJÀ CONFIGURÉ**
- [x] `WAVE_MERCHANT_PHONE` - Numéro merchant Wave (si utilisé) ✅ **DÉJÀ CONFIGURÉ**
- [x] `WAVE_QR_URL` - URL QR Wave (si utilisé) ✅ **DÉJÀ CONFIGURÉ**

### Emails (SMTP)
- [x] `SMTP_HOST` - Hôte serveur SMTP ✅ **DÉJÀ CONFIGURÉ**
- [x] `SMTP_PORT` - Port SMTP ✅ **DÉJÀ CONFIGURÉ**
- [x] `SMTP_USER` - Utilisateur SMTP ✅ **DÉJÀ CONFIGURÉ**
- [x] `SMTP_PASS` - Mot de passe SMTP ✅ **DÉJÀ CONFIGURÉ**
- [x] `SMTP_FROM` - Adresse expéditeur ✅ **DÉJÀ CONFIGURÉ**
- [x] `SMTP_SECURE` - Secure true/false ✅ **DÉJÀ CONFIGURÉ**

### IA / LLM
- [x] `QWEN_CLOUD_API_KEY` - Clé API QwenCloud (vision notamment) ✅ **DÉJÀ CONFIGURÉ**
- [x] `QWEN_CLOUD_BASE_URL` - Base URL QwenCloud ✅ **DÉJÀ CONFIGURÉ**
- [x] `QWEN_MODEL` - Modèle Qwen ✅ **DÉJÀ CONFIGURÉ**
- [ ] `DEEPSEEK_API_KEY` - Clé API DeepSeek (fournisseur texte prioritaire) ❌ **MANQUANT**
- [x] `OPENAI_API_KEY` - Clé OpenAI (intégrations existantes) ✅ **DÉJÀ CONFIGURÉ**
- [ ] `ALIEXPRESS_RAPIDAPI_KEY` - Clé AliExpress RapidAPI (si utilisé) ❌ **MANQUANT**

### Autres intégrations
- [x] `APIFY_TOKEN` - Token APIfy (si utilisé) ✅ **DÉJÀ CONFIGURÉ**
- [ ] `ADMIN_EMAIL` - Email administrateur ❌ **MANQUANT**

### Monitoring & Maintenance
- [ ] `MAINTENANCE_CRON_DISABLED` - `true` pendant migration, `false` en fonctionnement ❌ **MANQUANT**
- [ ] `SENTRY_DSN` - DSN serveur Sentry (recommandé pour recette) ❌ **MANQUANT**

### IA / LLM (DeepSeek)
- [ ] `DEEPSEEK_API_KEY` - Clé API DeepSeek (fournisseur texte prioritaire) ❌ **MANQUANT**

### Monitoring
- [ ] `SENTRY_DSN` - DSN serveur Sentry (recommandé pour recette)

### Maintenance
- [ ] `MAINTENANCE_CRON_DISABLED` - `true` pendant migration, `false` en fonctionnement

---

## GitHub Variables (lues via vars.NOM)

**ÉTAT ACTUEL : 0/4 configurées - TOUTES À CONFIGURER**

### IA / LLM
- [ ] `DEEPSEEK_MODEL` - `deepseek-chat` ❌ **MANQUANT**
- [ ] `LLM_TEXT_PROVIDER` - `deepseek` (ou `qwencloud` pour utiliser Qwen à la place) ❌ **MANQUANT**

### Worker
- [ ] `AGENT_WORKER_ENABLED` - `false` (ou `true` après validation capacité machine) ❌ **MANQUANT**

### Navigateur (injection build Docker)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - DSN public navigateur Sentry (vide = désactivé) ❌ **MANQUANT**

---

## Variables du Build Mobile (NON dans GitHub)

Ces variables sont à configurer dans `mobile/app/.env` et l'environnement EAS :

### Configuration EAS locale
- [ ] `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - **OBLIGATOIRE** pour profil audit (restreindre par package/signature)
- [ ] `EXPO_PUBLIC_API_BASE_URL` - `https://itvisionplus.sn` (profil audit hérite déjà)
- [ ] `EXPO_PUBLIC_PROJECT_ID` - ID projet EAS (doit correspondre à `extra.eas.projectId`)
- [ ] `EXPO_PUBLIC_SENTRY_DSN` - DSN public Sentry mobile (vide = reporting désactivé)

**NOTE** : Le profil EAS `audit` a déjà :
- `XEUY_AUDIT_BUILD=1` (runtime audit-2026-10)
- `SENTRY_DISABLE_AUTO_UPLOAD=true` (pas d'upload sourcemaps)

Ne PAS ajouter ces variables manuellement.

---

## Écarts connus (variables non transmises par workflow)

Ces variables sont lues par le code mais **PAS transmises** par le workflow/Compose actuel.
Si elles sont nécessaires, il faut les raccorder manuellement dans `docker-compose.ec2.yml` :

- [ ] `ADDRESS_GEOCODING_URL` - Endpoint géocodeur personnalisé (optionnel)
- [ ] `QWEN_VL_MODEL` - Modèle vision Qwen
- [ ] `LLM_VISION_PROVIDER` - Fournisseur vision
- [ ] `OLLAMA_BASE_URL` - URL serveur Ollama
- [ ] `OLLAMA_MODEL` - Modèle Ollama texte
- [ ] `OLLAMA_VL_MODEL` - Modèle Ollama vision
- [ ] `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` - Clé publique push web
- [ ] `WEB_PUSH_PRIVATE_KEY` - Clé privée push web
- [ ] `WEB_PUSH_EMAIL` - Email contact push web
- [ ] `SHIPPING_ADJUST_TOLERANCE` - Tolérance ajustement (défaut 0.1 = 10%)

**Ne PAS** configurer ces variables uniquement dans GitHub sans les raccorder au Compose.

---

## Contrôle final avant déploiement

Après avoir configuré tous les secrets/variables ci-dessus :

```bash
# Vérifier que le workflow peut résoudre la configuration
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml config --quiet
```

**ATTENTION** : Ne pas lancer `docker compose config` sans `--quiet` dans un journal partagé (la configuration résolue peut exposer les secrets).

---

## Checklist de validation

- [ ] Tous les Secrets GitHub ci-dessus sont configurés
- [ ] Toutes les Variables GitHub ci-dessus sont configurées
- [ ] `mobile/app/.env` contient les variables mobile avec la clé Maps
- [ ] Aucun secret de développement n'est dans les Variables
- [ ] `PAYMENTS_MOCK=false` pour production
- [ ] `MAINTENANCE_CRON_DISABLED=true` pendant migration
- [ ] Les identifiants Mongo existants sont conservés
- [ ] JWT/NEXTAUTH/CRON secrets sont cohérents entre instances
- [ ] Redis est accessible depuis l'app et les workers
- [ ] Aucun token dev ou code OTP test sur comptes réels

---

## Sources

- [Workflow GHCR/EC2](../.github/workflows/deploy-ghcr-ec2.yml)
- [Compose EC2](../docker-compose.ec2.yml)
- [Audit environnement](ENV_DEPLOIEMENT_AUDIT_2026-10.md)
