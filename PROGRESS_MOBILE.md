# ITVision Mobile — Progress & Roadmap

> Indriver-style services marketplace (Dakar, Sénégal — FCFA)
> Stack : Expo Router 51 / React Native 0.74 / Next.js 15 / Socket.io / MongoDB

---

## ✅ État actuel — fonctionnel

### Backend
- [x] `POST /api/services/requests` (auth + emit `request:new` à `providers-online`)
- [x] `GET /api/services/requests?mine=1` (enrichi `offerCount`/`pendingOfferCount`)
- [x] `GET /api/services/requests/[id]` (Next 15 await params)
- [x] `GET /api/services/requests/[id]/offers` (Next 15 await params)
- [x] `POST /api/services/requests/[id]/accept` (emit `offer:accepted` + `request:assigned`)
- [x] `POST /api/services/offers` (emit `offer:new` à `request-{id}`)
- [x] `GET /api/services/offers?mine=1`
- [x] `GET /api/services/matching` (geoNear + score distance/recency)
- [x] WS auth dual : JWT + `DEV_MOBILE_TOKEN` + `DEV_PROVIDER_TOKEN` (dev only)
- [x] Rooms : `request-{id}`, `provider-{id}`, `providers-online`, `user-{id}`

### Mobile consumer (8 écrans)
- [x] `index.tsx` Home : greeting, CTA, stats, activité récente, catégories, accès profil + cloche notifs
- [x] `create-request.tsx` : stepper 3 étapes + upload médias (5 fichiers max) + invalidation cache
- [x] `my-requests.tsx` : liste avec badges + WS + pull-to-refresh + nav vers mission si assigned
- [x] `request-offers.tsx` : WS room + countdown expiration live + accept cross-platform + auto-redir mission
- [x] `mission/[id].tsx` : carte, statut temps réel WS, infos provider, boutons annuler/terminer
- [x] `notifications.tsx` : centre de notifications (offres reçues, missions assignées, statuts)
- [x] `profile.tsx` : stats, historique, déconnexion
- [x] Cache stale-while-revalidate (`home-requests`, `my-requests`, `offers-{id}`)
- [x] **`<TabBar />` partagé** (Accueil / Demandes / Notifications / Profil) avec badge unread

### Mobile provider (6 écrans)
- [x] `index.tsx` Home : Switch online câblé WS (persisté AsyncStorage) + cloche notifs
- [x] `nearby-requests.tsx` : Vue Carte+Liste, modal offre, pop-up `request:new` + `offer:accepted`
- [x] `my-offers.tsx` : Liste avec stats, écoute WS + nav vers active-mission si accepted
- [x] `active-mission/[id].tsx` : adresse client, médias, carte, boutons démarrer/terminer + WS live
- [x] `notifications.tsx` : centre de notifications (nouvelles demandes, offres acceptées/refusées)
- [x] `profile.tsx` : stats offres/revenus, déconnexion
- [x] **`<TabBar />` partagé** (Tableau / Mes offres / Notifications / Profil) avec badge unread

### Backend API ajoutées
- [x] `GET /api/services/requests/[id]` enrichi : retourne `acceptedOffer` + autorisé provider assigné
- [x] `PATCH /api/services/requests/[id]` : transitions de statut sécurisées (client/provider) + emit `request:status-changed`
- [x] `POST /api/upload` (existant) : upload images/vidéos via FormData, streaming vidéo > 5MB

### Web compat
- [x] Bundle web fonctionne (shims `crypto.web.js` + `react-native-maps.web.js` + Metro resolver)
- [x] Mode liste forcé sur web (carte indispo)
- [x] Fallback géoloc **Dakar** (lat: 14.6928, lng: -17.4467) sur timeout 5s ✅

---

## 🐛 Bugs récemment corrigés (session)

| # | Bug | Fichier | Fix |
|---|---|---|---|
| 1 | `Unable to resolve "../Utilities/Platform"` | metro.config.js | Custom resolver web |
| 2 | `require('crypto')` sur web | shims/crypto.web.js | Web Crypto API |
| 3 | `UIManager.hasViewManagerConfig` | shims/react-native-maps.web.js | Stub no-op |
| 4 | `JWSInvalid` REST avec dev token | src/lib/jwt.ts | Fallback DEV tokens |
| 5 | Next 15 `params.id` warning | requests/[id]/* routes | `await params` |
| 6 | Erreurs serveur affichées génériques | consumer/src/api.ts | Lit `body.error` |
| 7 | Cache stale après accept offre | request-offers.tsx | `load(true)` |
| 8 | Pas de pop-up nouvelle demande | requests/route.ts + nearby-requests | emit `request:new` + listener |
| 9 | Self-offer 403 (consumer=provider en dev) | jwt.ts + server.js | `DEV_PROVIDER_TOKEN` séparé |
| 10 | Bouton "Choisir ce prestataire" inerte sur web | consumer/src/confirm.ts + request-offers.tsx | `Alert.alert` avec callbacks → helper `confirm()` cross-platform (window.confirm sur web) |
| 11 | Pas de durée de validité d'offre | Offer model + API offers/accept + UI provider/consumer | Champ `validityMinutes` (défaut 30, max 24h) + chip countdown live + 410 Gone si expirée |
| 12 | Pas d'écrans post-acceptation | consumer mission/[id].tsx + provider active-mission/[id].tsx | Carte, statut temps réel WS, boutons annuler/démarrer/terminer |
| 13 | Pas de profil utilisateur | consumer/provider profile.tsx | Stats, historique, liens rapides, déconnexion |
| 14 | Pas d'upload photos/vidéos dans demande | create-request.tsx + media.ts + apiUpload | Helper cross-platform pickMedia + upload FormData → /api/upload (5 fichiers max) |
| 15 | API requests/[id] trop restrictive | requests/[id]/route.ts | GET autorisé provider assigné + retourne acceptedOffer ; PATCH transitions sécurisées + WS |
| 16 | Crash `<Image>` web sur média invalide | mission/[id].tsx + active-mission/[id].tsx + create-request.tsx | Normalisation/validation URL + fallback non-image + guards upload |
| 17 | Tab bar locale incomplète, profil non joignable | consumer/provider `_layout` + `src/components/TabBar.tsx` | Composant `<TabBar />` partagé + bell badge unread, brancher sur Home/Demandes/Mes offres/Notifications/Profil |
| 18 | Aucun centre de notifications (events WS volatils) | `src/notifications.ts` + `app/notifications.tsx` (consumer + provider) | Store AsyncStorage + abonnement socket centralisé (`bindNotificationSocket`) avec dédoublonnage et navigation contextuelle |

---

## 🎯 Roadmap — alignée diagnostic Sénégal

### ✅ Acquis (sessions précédentes + actuelle)
- [x] **`offer:rejected` WS** : émis dans `accept/route.ts` aux providers perdants
- [x] **Consumer `my-requests`** : WS room `user-{userId}` (events `user:offer-received` / `user:request-assigned`)
- [x] **Provider Switch online** : `src/online.ts` (AsyncStorage) + `join-provider-channel`
- [x] **Détail mission consumer** (`/mission/[id]`) — carte, statut WS, annuler/terminer
- [x] **Mission active provider** (`/active-mission/[id]`) — adresse, médias, démarrer/terminer + WS
- [x] **Profil consumer & provider** (stats, historique, déconnexion)
- [x] **Navigation conditionnelle** my-requests / my-offers / request-offers
- [x] **Upload médias** (`pickMedia` + `apiUpload` + 5 fichiers max)
- [x] **Hardening `<Image>` web** + fallback non-image
- [x] **`<TabBar />` partagé** consumer + provider avec badge unread
- [x] **Centre notifications** persistent (`src/notifications.ts` + `app/notifications.tsx` × 2) branché aux events WS

### 🔥 P0 — Indispensable avant pilote terrain (2-3 semaines)
- [x] **Auth réelle OTP SMS** — `OtpCode` model + `src/lib/sms.ts` (dev console / Twilio) + endpoints `send-otp` & `verify-otp` + écrans `login.tsx` & `verify-otp.tsx` + auth guard `_layout.tsx` + `src/auth.ts` (AsyncStorage) + refactor `api.ts` & `socket.ts` token dynamique + déconnexion réelle dans profils
- [x] **Push notifications** Expo (FCM + APNs) pour `request:new`, `offer:new`, `offer:accepted`, `offer:rejected`, `request:status-changed` — `src/lib/push.ts` + `PushToken` model + endpoint + modules `src/push.ts` consumer/provider
- [x] **Reverse geocoding + champ "repère / quartier"** obligatoire à la création (Nominatim) — `consumer/src/geocode.ts` + champ landmark dans `create-request.tsx`
- [x] **Fallback géoloc Dakar** (14.6928, -17.4467) — corrigé dans `nearby-requests.tsx` & `create-request.tsx`
- [x] **`providerName` depuis User DB** — `provider/src/user-profile.ts` + `subscribeProfile` réactif (profil, home, offres)
- [x] **Rate limit** + validation stricte sur `POST /api/services/requests` & `/offers` — `serviceWriteRateLimiter` (10/15min) + validations coordonnées, prix, longueurs
- [x] **Greeting consumer dynamique** — `greetingByHour()` + prénom depuis `/api/client/profile` ; avatar initiales dynamiques

### 🚀 P1 — Différenciation marché (1 mois)
- [x] **Note vocale** Wolof/Français dans demande (record + lecture côté provider) — `VoiceRecorder.tsx` consumer (hold-to-record, pulse anim, cancel/confirm) + `VoicePlayer.tsx` consumer/provider (progress bar, play/stop) + upload audio via `apiUpload` + intégration step 2 create-request + lecture inline dans nearby-requests provider
- [x] **i18n** fr / wo / en (i18next + locales statiques) — `src/i18n/` (fr.json, wo.json, en.json, index.ts) consumer/provider + `loadSavedLanguage()` au boot + `changeLanguage()` persisté AsyncStorage + `LanguagePicker.tsx` dans profils consumer/provider
- [x] **Mobile Money** : intégration Wave / Orange Money / Free Money — `Payment` model (escrow: pending→held→released/refunded) + `src/lib/payment.ts` (adapters Wave/OM/Free, dev mock) + `POST /api/payments/initiate` + `POST /api/payments/webhook` + `POST /api/payments/release` + écran `payment.tsx` consumer (choix provider, deeplink)
- [x] **Notation 5★ + commentaire** post-mission + agrégat sur profil provider — `ServiceReview` model + `POST/GET /api/services/reviews` + écran `rate-mission.tsx` + note moyenne dans offres
- [x] **KYC léger provider** : CNI + selfie + métier validé manuellement → badge "Vérifié" — `KycRequest` model + `POST /api/kyc/submit` + `GET /api/kyc/status` + `PATCH /api/kyc/:id` (admin approve/reject) + `kycVerified` sur User + badge `✓ Vérifié` dans offres enrichies + écran `kyc.tsx` provider (upload CNI+selfie, statut)
- [x] **Chat in-mission** (room `mission-{id}`, events `chat:message`) + deeplink WhatsApp en backup — `ChatMessage` model + `POST/GET /api/services/chat` + écrans `mission-chat.tsx` consumer/provider + boutons chat dans mission
- [x] **Catégories dynamiques** (collection MongoDB + cache client) avec sous-catégories métier locales — `ServiceCategory` model (slug, labels fr/wo/en, abbr, color, subCategories) + `GET/POST /api/services/categories` + `scripts/seed-categories.ts` (8 catégories + sous-cat) + `src/categories.ts` consumer/provider (cache 10min, fallback offline) + intégration dynamique dans create-request.tsx
- [x] **Statuts mission étendus** : `assigned` → `provider_arriving` → `in_progress` → `completed` (timestamps) — bouton "En route" provider + timestamps `assignedAt/providerArrivingAt/startedAt/completedAt/cancelledAt`

### 🛠 P2 — Croissance & robustesse
- [x] **Queue offline** des actions POST/PATCH (AsyncStorage + replay FIFO au boot) — offlineQueue.ts consumer/provider, apiPostQueued/apiPatchQueued dans api.ts, branchement: create-request, send-offer, status-change, cancel-mission, rate-mission
- [x] **Tracking live provider en route** (socket position toutes les 10s, room request) — provider émet `provider:location` pendant `provider_arriving`, consumer affiche marker temps réel sur la carte mission
- [x] **Prix indicatif client** (médiane historique catégorie × quartier) — endpoint GET /api/services/price-estimate (haversine 5km, percentile p25/median/p75), intégré dans create-request.tsx avec hint vert sous le label Budget
- [x] **Skeleton loaders** + `expo-image` pour les médias — composant `Skeleton/SkeletonCard` consumer/provider + intégration Home, Nearby Requests, My Offers
- [x] **Bottom sheet animé** composant custom (Animated API + PanResponder, swipe-down dismiss, spring animation, backdrop, KeyboardAvoidingView) — remplacé Modal dans nearby-requests.tsx, composant réutilisable consumer/provider
- [x] **Search/Filter** my-requests / my-offers (recherche texte + filtres statut : actives, offres, attente, terminées)
- [x] **Tests E2E Playwright** flow complet services mobile (13 tests : OTP login → create request → matching → send offer → accept → status updates → rate → verify review) — tests/services/mobile-flow.spec.ts, projet `services-mobile` dans playwright.config.ts
- [x] **Tests unitaires** offlineQueue (14 tests × 2 apps = 28 pass) — Jest 29 + ts-jest, mocks AsyncStorage/NetInfo/RN, couvre isNetworkError, enqueue, replay FIFO, déduplication, erreurs réseau vs métier, clearQueue
- [x] **Sentry** mobile (sentry-expo + @sentry/react-native) — src/sentry.ts init/setUser/clearUser/captureError/addBreadcrumb, auto-capture 5xx dans handleStatus, initSentry() au boot _layout.tsx, user context lié à l'auth
- [x] **EAS Build** config (eas.json 3 profils : development/preview/production + app.json production-ready avec icon/splash/bundleId/adaptiveIcon/runtimeVersion/infoPlist/sentry-expo plugin)
- [x] **Catégories dynamiques partout** — remplacé tous les CAT_COLORS/CAT_ABBR/CAT_LABELS hardcodés par catMap dynamique (index, my-requests, request-offers, nearby-requests)
- [x] **ErrorBoundary global** — composant classe React consumer/provider, wraps SafeAreaProvider dans _layout.tsx, retry button
- [x] **Splash brandé** — Consumer: fond #0F172A "Ligey", Provider: fond #78350F "Ligey Pro" avec spinner
- [x] **Upload audio fix** — route /api/upload accepte audio/mp4 + 7 MIME types, max 10MB
- [x] **Permissions audio natives** — RECORD_AUDIO Android + expo-av plugin dans app.json consumer/provider
- [x] **VoiceRecorder robuste** — ref stable (pas de stale closure), cleanup recording on unmount
- [x] **VoicePlayer memory leak fix** — unload sound on unmount consumer/provider
- [x] **Navigation mission correcte** — home + my-requests naviguent vers mission/[id] pour assigned/provider_arriving/in_progress/completed
- [x] **provider_arriving status** — ajouté dans STATUS_LABEL (index.tsx) et STATUS_CONFIG (my-requests.tsx) consumer
- [x] **EC2 deploy** — profil `ec2` dans eas.json consumer/provider, script deploy-ec2.sh, template .env.local
- [x] **Geofencing serveur** — `providerPositions` Map in-memory dans server.js, haversine filter 10km, `global.notifyNearbyProviders()` utilisé par POST /api/services/requests au lieu du broadcast global, fallback broadcast si aucun provider a de position connue
- [x] **Heartbeat de localisation provider** — provider émet `provider:gps` toutes les 60s via `emitGps()` depuis le home screen quand online, positions stale (>10min) ignorées par le geofencing
- [x] **Empty states illustrés** — composant `EmptyState.tsx` réutilisable (icon cercle, titre, sous-titre, CTA optionnel), intégré dans : consumer home, my-requests, notifications + provider nearby-requests, my-offers, notifications
- [x] **Retry backoff mobile** — `fetchWithRetry` + `apiGetRetry` dans api.ts consumer/provider (exponential backoff 300ms→600ms, max 2 retries), utilisé pour le prix indicatif
- [x] **Rate limit price-estimate** — `serviceReadRateLimiter` 30 req/min pour éviter le spam
- [x] **VALID_CATEGORIES dynamique backend** — `getActiveCategorySlugs()` avec cache 60s + fallback hardcodé, remplace le tableau statique dans POST /api/services/requests
- [x] **Geofencing logs ops** — console.log `[GF]` notifiés/dans le radius/total trackés pour observabilité
- [x] **Cleanup positions stale serveur** — `setInterval` toutes les 10min supprime les positions >10min de `providerPositions`

### 💰 P4 — Écosystème & monétisation progressive
- [x] **Wallet + XC (Xeuy Coin)** — Nomenclature : 1 XC = 100 FCFA. `AppConfig` model (feature-flag `monetization.mode` free/points/commission + `escrow` config, pilotable sans redéploiement, cache 60s `getAppConfig`) + `Wallet` model étendu (`points` → XC, `lifetimePointsEarned/Spent`) + `WalletTransaction` ledger paginable + `src/lib/wallet.ts` (`getOrCreateWallet`, `creditPoints`, `debitPoints` atomique, `spendOnWonMission`, `isPointsModeActive`) + `GET /api/wallet` (solde + config escrow + historique 50) + `POST /api/wallet/topup` (recharge Wave/OM/Free, crédit instantané en dev, webhook-ready en prod) + crédit de bienvenue 25 XC à l'inscription (`verify-otp`) + bonus parrainage miroir en XC + écran `wallet.tsx` consumer/provider (solde XC, packs 25/50/100/250, opérateurs, historique avec labels XC) + lien dans profils + CORS `/api/wallet`
- [x] **Escrow sélectionnable** — `AppConfig.escrow.enabled` + `escrow.mandatory` (contrôlable admin). Si activé + optionnel : l'utilisateur peut choisir "Paiement sécurisé escrow" (coût 25 XC) ou "Paiement direct" (sans frais). Si mandatory : passage forcé par escrow. `POST /api/payments/initiate` accepte `useEscrow` et débite les XC uniquement si sélectionné. `Payment.useEscrow` stocké en DB. `POST /api/services/requests/:id/accept` refuse si `escrow.mandatory=true` (redirection forcée vers écran paiement). `acceptOfferForRequest` centralise les side-effects (assignment, push, sockets) avec `securePayment` et `notifyClientPaymentHeld` conditionnels. Dev mode : paiement mock passe directement en `held` et assigne la mission.
- [x] **Rollback escrow robuste** — `POST /api/payments/initiate` rembourse automatiquement les XC escrow si `initiatePayment` échoue, si le provider lève une exception, ou si `Payment.create` fail (garantie transactionnelle côté client).
- [x] **Contre-offre en live (InDriver-like)** — `Offer` model étendu avec `clientCounterPrice`, `clientCounterAt`, `clientCounterComment`, `clientCounterStatus` (pending/accepted/rejected). `POST /api/services/offers/:id/counter` (client fait une contre-offre à un provider avec prix + commentaire) + `POST /api/services/offers/:id/counter-response` (provider accepte/refuse). WebSocket temps réel : `offer:counter` → provider, `offer:counter-accepted` / `offer:counter-rejected` → client + room request. Push notifications aux deux acteurs. Consumer `request-offers.tsx` : bouton '💬 Négocier' par offre → modal prix/commentaire → affichage statut contre-offre (pending/acceptée/refusée) + bouton 'Payer au nouveau prix' si acceptée. Provider `my-offers.tsx` : filtre dédié 'Contre-offres', carte avec prix proposé vs prix original, boutons 'Accepter' (met à jour `price`) / 'Refuser', indicateurs visuels si déjà traitée. Provider `nearby-requests.tsx` : bouton '✓ Accepter ce budget' pour proposer exactement le budget client en un clic.
- [x] **Admin Plateforme** — API `GET/POST /api/admin/platform/config` (feature toggles, AppConfig, cache invalidation) + `GET /api/admin/platform/analytics` (KPIs users/missions/wallet/payments + tendances 7j) + `GET /api/admin/platform/wallets` (liste paginée, recherche, tri) + `GET /api/admin/platform/transactions` (historique filtrable par type/date/utilisateur) + UI pages `/admin/platform/config` (éditeur monétisation + escrow avec labels XC), `/admin/platform/analytics` (dashboard KPIs + graphiques), `/admin/platform/wallets`, `/admin/platform/transactions` + section "Plateforme" dans `AdminSidebar.tsx`
  - **Stratégie** : 3-6 mois gratuits (`mode: 'free'`, `pointsPerWonMission: 0`) pour bâtir le volume → bascule DB vers `mode: 'points'` sans redéploiement. Escrow optionnel par défaut, passable en mandatory depuis l'admin.
  - **TODO restant** : déploiement webhook prod (configurer URL callback opérateurs vers `/api/wallet/webhook`).

### 🎯 P3 — Inattendu, fort potentiel local Sénégal
- [ ] **Tontine provider** intégrée (épargne collective hebdo, déclencheur Wave)
- [x] **Parrainage** code référent (1 000 FCFA crédités après 1ère mission complétée) — `User` model: `referralCode` (unique 6-chars), `referredBy`, `referralBalance`, `referralCount` + `src/lib/referral.ts` helper `generateReferralCode/createUniqueReferralCode/validateReferralCode/creditReferrerOnFirstMission` + `verify-otp` génère code automatiquement à la création + accepte `referralCode` optionnel pour lier `referredBy` + `GET /api/auth/referral` endpoint (stats) + crédit auto quand `status → completed` si première mission du referred + section parrainage dans profils consumer/provider avec bouton partage natif `Share.share`
- [ ] **Mode "Daara"** : missions caritatives gratuites (visibilité + acquisition)
- [ ] **Marketing quartier** push géolocalisé ("Première intervention -50% à Sacré-Cœur / Mermoz / HLM")
- [ ] **Centre d'appel intégré** : opérateur crée une demande au nom d'un client illettré (channel `callcenter` déjà prévu dans le modèle ✅)

---

## 🔌 Configuration dev (rappel)

### Serveur `.env.local`
```env
DEV_MOBILE_TOKEN=dev-mobile-token-123
DEV_PROVIDER_TOKEN=dev-provider-token-456
JWT_SECRET=votre-secret-jwt
MONGODB_URI=mongodb://localhost:27018/itvision
```

### `mobile/consumer/.env`
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_AUTH_TOKEN=dev-mobile-token-123
EXPO_PUBLIC_PROVIDER_NAME=LIGUEY
```

### `mobile/provider/.env`
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_AUTH_TOKEN=dev-provider-token-456
EXPO_PUBLIC_PROVIDER_NAME=LIGUEY
```

### Commandes
```powershell
# Backend
cd d:\itvision-1
node server.js

# Consumer
cd d:\itvision-1\mobile\consumer
npx expo start --web

# Provider
cd d:\itvision-1\mobile\provider
npx expo start --web --port 8082
```

---

## 📁 Modèles DB

### `ServiceRequest`
```ts
{
  clientId: string,
  category: 'electricite'|'plomberie'|'menuiserie'|'peinture'|'climatisation'|'securite',
  description?: string,
  media: [{ url, type, title }],
  location: { type: 'Point', coordinates: [lng, lat], address? },
  budget?: number,
  channel: 'web'|'mobile'|'pwa'|'whatsapp'|'callcenter',
  status: 'created'|'pending_offers'|'assigned'|'in_progress'|'completed'|'cancelled',
  assignedProviderId?: ObjectId,
  selectedOfferId?: ObjectId,
  createdAt, updatedAt
}
```

### `Offer`
```ts
{
  requestId: ObjectId,
  providerId: string,
  providerName?: string,
  price: number,
  etaMinutes?: number,
  comment?: string,
  validityMinutes: number,  // 1..1440, défaut 30
  validUntil: Date,         // calculé à la création
  status: 'submitted'|'withdrawn'|'accepted'|'rejected'|'expired',
  createdAt
}
```

---

## 🔄 Flow complet attendu (Indriver-style)

```
1. Consumer crée demande
   POST /api/services/requests
   → emit `request:new` (providers-online)

2. Provider voit pop-up + actualise liste

3. Provider envoie offre
   POST /api/services/offers
   → emit `offer:new` (request-{id})

4. Consumer voit l'offre apparaître en temps réel sur request-offers

5. Consumer accepte une offre
   POST /api/services/requests/[id]/accept
   → emit `offer:accepted` (provider-{winnerId})
   → emit `offer:rejected` (provider-{loserIds})
   → emit `request:assigned` (request-{id})
   → emit `user:request-assigned` (user-{clientId})

6. Provider gagnant redirige automatiquement vers `active-mission/[id]` (WS `offer:accepted`)
   Providers perdants voient "Offre refusée" sur `my-offers` (WS `offer:rejected`)

7. Provider en route → "en cours" → "terminé" (PATCH `request:status-changed` ✅)
   Étape "arrivé" intermédiaire à venir (P1)

8. Consumer note le provider [P1 — notation 5★]
```

---

## 🚧 Couverture WS

| Event | Émetteur | Récepteur | Statut |
|---|---|---|---|
| `request:new` | `POST /requests` | `providers-online` | ✅ |
| `offer:new` | `POST /offers` | `request-{id}` | ✅ |
| `offer:accepted` | `POST /accept` | `provider-{winnerId}` | ✅ |
| `offer:rejected` | `POST /accept` | `provider-{loserIds}` | ✅ |
| `request:assigned` | `POST /accept` | `request-{id}` | ✅ |
| `request:status-changed` | `PATCH /requests/[id]` | `request-{id}` | ✅ |
| `user:offer-received` | `POST /offers` | `user-{clientId}` | ✅ |
| `user:request-assigned` | `POST /accept` | `user-{clientId}` | ✅ |
| `chat:message` | `POST /missions/[id]/messages` | `mission-{id}` | ❌ P1 |
| `mission:provider-location` | heartbeat provider 30s | `mission-{id}` | ❌ P2 |
| `notification:push` | tous events ci-dessus | FCM/APNs (app fermée) | ✅ `src/lib/push.ts` |