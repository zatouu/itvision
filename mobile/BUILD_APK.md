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

Les `app.json` contiennent des projectId placeholders. Remplace-les par ton vrai projectId Expo, ou configure le projet automatiquement :

```bash
cd mobile/consumer
eas configure  # ou eas init pour créer un nouveau projet Expo
```

## 2. Build APK pour EC2

Avant de builder, remplace `YOUR_EC2_PUBLIC_IP` dans `mobile/consumer/eas.json` et `mobile/provider/eas.json` par l'IP publique réelle de ton serveur EC2.

**Consumer** :
```bash
cd mobile/consumer
npm run build:apk
# ou directement :
# eas build --platform android --profile ec2
```

**Provider** :
```bash
cd mobile/provider
npm run build:apk
```

> Le profil `ec2` génère un APK installable directement (`android.buildType: "apk"`) et pointe vers ton serveur EC2.

## 3. Récupérer et installer l'APK

1. **Téléchargement** — EAS te donne un lien de téléchargement à la fin du build (~5-10 min)
2. **Partage** — Envoie le lien par WhatsApp / email aux testeurs
3. **Installation** — Sur Android :
   - Autorise **"Sources inconnues"** dans les paramètres du navigateur
   - Télécharge et installe l'APK
   - Ou via ADB : `adb install app.apk`

## 4. Build pour production (Google Play — AAB)

```bash
eas build --platform android --profile production
```

Génère un `.aab` (Android App Bundle) à uploader sur la Google Play Console.

## Raccourcis

| Commande | Description |
|----------|-------------|
| `npm run build:apk` | APK interne, pointe vers EC2 |
| `npx expo start` | Dev local avec Expo Go (pas d'APK) |
| `expo run:android` | Build local Android (nécessite Android SDK) |

## Profils EAS configurés

### Consumer (`mobile/consumer/eas.json`)
- `development` — Dev client (hot reload)
- `preview` — Build interne iOS/Android (staging)
- `ec2` — APK Android interne (API EC2) ← **profil par défaut pour tests terrain**
- `production` — AAB + auto-increment version

### Provider (`mobile/provider/eas.json`)
- Mêmes profils que consumer

## Notes

- **Pas besoin de Mac** : EAS build les APK sur les serveurs Expo (cloud)
- **Pas besoin de Android SDK** local pour EAS
- **Distribution interne** (`distribution: internal`) : les testeurs n'ont pas besoin de compte Expo
- Si tu veux partager à plusieurs testeurs sans WhatsApp, utilise **Firebase App Distribution** après le build
