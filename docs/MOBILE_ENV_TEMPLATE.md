# Configuration Mobile Xeuy - Template pour build APK Audit

## Instructions

Créer le fichier `mobile/app/.env` avec le contenu ci-dessous et remplacer les placeholders.

**NE PAS COMMITTER .env** (déjà dans .gitignore)

---

## Contenu de mobile/app/.env

```dotenv
# API Backend - Profil audit hérite déjà de https://itvisionplus.sn
# EXPO_PUBLIC_API_BASE_URL=https://itvisionplus.sn

# Google Maps API Key - OBLIGATOIRE pour le profil audit
# Restreindre par package Android et certificat de signature
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=REMPLACER_PAR_LA_CLE_MAPS_RESTREINTE

# Projet EAS - Doit correspondre à extra.eas.projectId dans app.config.js
EXPO_PUBLIC_PROJECT_ID=REMPLACER_PAR_LE_MEME_ID_QUE_LE_PROJET_EAS

# Sentry Mobile - DSN public (vide = reporting désactivé)
EXPO_PUBLIC_SENTRY_DSN=
```

---

## Notes importantes

### Profil EAS 'audit'
Le profil `audit` dans `eas.json` définit déjà :
- `XEUY_AUDIT_BUILD=1` (runtime audit-2026-10)
- `SENTRY_DISABLE_AUTO_UPLOAD=true` (pas d'upload sourcemaps)

**NE PAS** ajouter ces variables manuellement dans `.env`.

### Variables d'environnement EAS
Pour le build EAS, deux options :

1. **Variables locales (recommandé pour le build audit)** :
   ```bash
   cd mobile/app
   set -a
   . ./.env
   set +a
   npx eas build --platform android --profile audit --non-interactive --no-wait
   ```

2. **Variables EAS** (configurées via `eas env:push` ou l'interface web) :
   ```bash
   eas env:push --platform android --profile audit
   ```

### Vérification du bundle
Après build, vérifier que la clé Maps est bien incluse :
```bash
# Sur le fichier .hbc dans dist/
grep -c -a AIzaSy
```

### Restrictions Google Maps
- Restreindre la clé par package Android (com.itvision.xeuy ou équivalent)
- Restreindre par certificat de signature APK
- Activer uniquement les APIs utilisées (Maps SDK, Places API si nécessaire)

---

## Profil EAS existant

```json
{
  "build": {
    "audit": {
      "extends": "ec2",
      "channel": "audit-2026-10",
      "env": {
        "XEUY_AUDIT_BUILD": "1",
        "SENTRY_DISABLE_AUTO_UPLOAD": "true"
      }
    },
    "ec2": {
      "distribution": "internal",
      "channel": "ec2",
      "autoIncrement": true,
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://itvisionplus.sn"
      }
    }
  }
}
```

Le profil `audit` hérite de `ec2`, donc l'API est déjà `https://itvisionplus.sn`.
