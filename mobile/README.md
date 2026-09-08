# Xeuy Bi — App mobile unifiée

App mobile Expo (React Native) de la plateforme de services à domicile (Sénégal), type inDriver.

## Structure
- `mobile/app` : **application unique** — client (créer des demandes, suivre les offres et missions) **et** prestataire (demandes proches, offres, exécution des missions) dans la même app.
- La distinction client/prestataire est purement applicative : un utilisateur ayant un `ProviderProfile` peut basculer entre les deux modes via le menu latéral.

## Quick start
1. Installer Node 18+ et EAS CLI (optionnel) :
   - `npm i -g eas-cli`
2. Dans `mobile/app` :
   - `npm install`
   - `npm run start`  # ou: npx expo start
3. Configurer l'endpoint API via l'environnement :
   - `EXPO_PUBLIC_API_BASE_URL=https://your-backend.example.com`

Notes
- Par défaut, l'app tente `http://localhost:3000` — OK pour émulateur sur la même machine que l'API. Sur appareil physique, mettre l'IP LAN dans `EXPO_PUBLIC_API_BASE_URL`.
- Paiements (Wave/Orange Money) gérés via le backend.
- Temps réel via Socket.IO ; le GPS prestataire n'est émis qu'en mode prestataire.
