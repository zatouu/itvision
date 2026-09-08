# Guide de build APK (sans Play Store)

## Prérequis

1. **Compte Expo** — Crée un compte gratuit sur [expo.dev](https://expo.dev) si ce n'est pas déjà fait
2. **EAS CLI** — Installé globalement :
   ```bash
   npm install -g eas-cli
   ```
3. **Connexion** — Connecte-toi à ton compte Expo :
   ```bash
   eas login
   ```

## 1. Configurer le projectId (première fois uniquement)

Le `app.json` contient le projectId du projet Expo. Pour un nouveau projet :

```bash
cd mobile/app
eas configure  # ou eas init pour créer un nouveau projet Expo
```

## 2. Build APK pour EC2

Avant de builder, vérifie `EXPO_PUBLIC_API_BASE_URL` dans `mobile/app/eas.json` (profil `ec2`).

```bash
cd mobile/app
npm run build:apk
# ou directement :
# eas build --platform android --profile ec2
```

> Le profil `ec2` génère un APK installable directement (`android.buildType: "apk"`) et pointe vers le serveur de production.

## 3. Récupérer et installer l'APK

1. **Téléchargement** — EAS donne un lien de téléchargement à la fin du build (~5-10 min)
2. **Partage** — Envoie le lien par WhatsApp / email aux testeurs
3. **Installation** — Sur Android :
   - Autorise **"Sources inconnues"** dans les paramètres du navigateur
   - Télécharge et installe l'APK
   - Ou via ADB : `adb install app.apk`

## 4. Build pour production (Google Play — AAB)

```bash
cd mobile/app
eas build --platform android --profile production
```

Génère un `.aab` (Android App Bundle) à uploader sur la Google Play Console.

## Raccourcis

| Commande | Description |
|----------|-------------|
| `npm run build:apk` | APK interne, pointe vers EC2 |
| `npx expo start` | Dev local (pas d'APK) |
| `expo run:android` | Build local Android (nécessite Android SDK) |

## Profils EAS configurés (`mobile/app/eas.json`)

- `development` — Dev client (hot reload)
- `preview` — Build interne iOS/Android (staging)
- `ec2` — APK Android interne (API production) ← **profil par défaut pour tests terrain**
- `production` — AAB + auto-increment version

## Notes

- **Pas besoin de Mac** : EAS build les APK sur les serveurs Expo (cloud)
- **Pas besoin de Android SDK** local pour EAS
- **Distribution interne** (`distribution: internal`) : les testeurs n'ont pas besoin de compte Expo
- Si tu veux partager à plusieurs testeurs sans WhatsApp, utilise **Firebase App Distribution** après le build
