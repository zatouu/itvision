# Itvision Mobile (Consumer & Provider)

Mobile-first apps to power the inDriver-like services platform (Sénégal), built with Expo (React Native).

## Structure
- mobile/consumer: client app to create service requests, follow offers and jobs
- mobile/provider: provider app to receive nearby requests, submit offers, and execute jobs

## Quick start
1. Install Node 18+ and Expo CLI (optional):
   - npm i -g expo-cli  # optional, you can also use npx
2. In each app folder:
   - npm install
   - npm run start  # or: npx expo start
3. Configure API endpoint via environment:
   - EXPO_PUBLIC_API_BASE_URL=https://your-backend.example.com

Notes
- By default, the apps will try http://localhost:3000 which works on emulators running on the same machine as the API. On physical devices, set EXPO_PUBLIC_API_BASE_URL to your LAN IP or a tunneled URL.
- Payment integrations (Wave/Orange Money) are stubbed at this stage.
- Real-time (Socket.IO) and geolocation background tasks will be added in later sprints.
