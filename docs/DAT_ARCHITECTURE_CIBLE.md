# DAT — Architecture cible IT Vision

**Projet** : IT Vision (corporate + marketplace + Xeuy Bi)  
**Statut** : v1.0 — en cours d’incrémentation  
**Date** : 2026-06-23  
**Auteur** : Cascade (pair-programming)  
**Standards** : 12-factor app, TypeScript strict, API-first, infrastructure as code, zero-trust par sous-domaine.

---

## 1. Contexte et périmètre

Le projet actuel est un monolithe Next.js (`d:\itvision-1`) qui héberge trois univers métier distincts :

1. **Corporate** (`itvisionplus.sn`) — services de sécurité électronique, portail client entreprise, portail technicien, devis/factures.
2. **Marketplace** (`market.itvisionplus.sn`) — sourcing direct depuis la Chine (1688, Taobao), achats groupés, e-commerce B2C/B2B.
3. **Xeuy Bi** (`app mobile`) — services à la demande type InDrive (électricité, menuiserie, artisan, etc.).

Les trois univers partagent aujourd’hui le même backend, les mêmes modèles Mongoose et le même middleware. Ce document définit l’architecture cible : **trois projets frontends distincts consommant un backend partagé progressivement découplé**, puis à terme un backend en services autonomes.

---

## 2. Principes directeurs (12-factor & standards actuels)

| Principe | Application concrète |
|----------|---------------------|
| **I. Codebase** | Un repo par projet (corporate, marketplace, xeuy-bi, backend). Aujourd’hui : un repo unique avec namespaces clairs. |
| **II. Dépendances** | Déclaration explicite (`package.json`, lockfile). Pas de dépendance globale. |
| **III. Config** | Configuration via variables d’environnement (`NEXT_PUBLIC_*`, `MONGODB_URI`, `JWT_SECRET`, etc.). Aucun secret en dur. |
| **IV. Backing services** | MongoDB, Redis (cache), S3/MinIO (uploads), Ollama/vLLM (LLM local), Twilio (SMS), Wave/OM/Free (Mobile Money). |
| **V. Build / Release / Run** | Build statique Next.js, conteneurs Docker pour le backend, CI/CD GitHub Actions. |
| **VI. Processus** | Processus sans état ; sessions JWT, uploads sur S3, cache sur Redis. |
| **VII. Port binding** | Chaque service expose un port unique. Backend API sur 3000, Ollama 11434, Redis 6379, etc. |
| **VIII. Concurrence** | Horizontal scaling via PM2 / Docker Compose / Kubernetes. |
| **IX. Disposability** | Démarrage rapide, arrêt gracieux, files d’attente pour tâches lourdes. |
| **X. Parité dev/prod** | Docker Compose local reproduit la prod. Mêmes images, mêmes versions. |
| **XI. Logs** | Logs structurés (JSON) agrégés vers un outil de monitoring. |
| **XII. Admin processes** | Migrations et scripts d’administration comme processus one-off (`npx tsx scripts/…`). |

**Normes de développement** :
- TypeScript strict, `noImplicitAny`.
- API-first : chaque feature commence par le contrat API.
- Validation stricte côté serveur (jamais de prix depuis le client).
- Tests : Playwright (E2E), Jest/Vitest (unit), type-check (`tsc --noEmit`) obligatoire avant merge.
- Code review et feature flags pour les changements sensibles.

---

## 3. Vue d’architecture cible

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DNS / CDN                                  │
│  itvisionplus.sn  ──────────────  market.itvisionplus.sn                │
│         │                                  │                            │
│         ▼                                  ▼                            │
│  ┌──────────────┐                 ┌──────────────┐                       │
│  │  Corporate   │                 │  Marketplace │                       │
│  │  Next.js     │                 │  Next.js     │                       │
│  └──────┬───────┘                 └──────┬───────┘                       │
│         │                                  │                            │
│         └──────────────┬─────────────────┘                            │
│                          │                                              │
│                          ▼                                              │
│              ┌─────────────────────┐                                   │
│              │   API Gateway       │  ← Next.js custom server          │
│              │   (backend partagé) │    + Socket.io + routes namespaces  │
│              └─────────┬───────────┘                                   │
│                        │                                                │
│         ┌──────────────┼──────────────┐                                │
│         ▼              ▼              ▼                                │
│   ┌──────────┐   ┌──────────┐   ┌────────────┐                         │
│   │  Auth    │   │ Catalog  │   │  Orders    │                         │
│   │  Service │   │ Service  │   │  & Payments│                         │
│   └──────────┘   └──────────┘   └────────────┘                         │
│         │              │              │                                │
│         └──────────────┴──────────────┘                                │
│                        │                                                │
│                        ▼                                                │
│              ┌─────────────────────┐                                   │
│              │   MongoDB Atlas /   │                                   │
│              │   MongoDB locale      │                                   │
│              └─────────────────────┘                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Xeuy Bi App (Expo / React Native)                              │   │
│  │  ── consomme Auth + Services + Payments via l’API Gateway       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Découpage par sous-domaine

### 4.1 Corporate (`itvisionplus.sn`)

**Pages clés** :
- `/` — landing sécurité électronique
- `/produits` — vitrine B2B produits tech (alimentée depuis le catalogue marketplace)
- `/produits/[id]` — fiche produit corporate
- `/portail-entreprise` — dashboard client entreprise
- `/client-portal/*` — portail client
- `/tech-interface/*` — portail technicien
- `/admin/*` — admin (produits, devis, factures, projets, maintenance)

**Modèles dédiés** : `Client`, `Project`, `Quote`, `Invoice`, `Intervention`, `MaintenanceContract`, `Technician`.

**Règles** :
- Un produit corporate doit avoir `corporateVisible: true` ou `channels: ['corporate']`.
- Le prix affiché est `b2bPrice`, puis `price` avec marge corporate.
- Les devis/factures sont créés à partir de projets ou de paniers corporate.

### 4.2 Marketplace (`market.itvisionplus.sn`)

**Pages clés** :
- `/market` — homepage marketplace
- `/produits` — catalogue grand public
- `/produits/[id]` — fiche produit avec pricing 1688
- `/achats-groupes` — liste des achats groupés
- `/panier`, `/commandes`, `/payment`, `/paiement`
- `/market/sourcing/*` — sourcing à la demande

**Modèles dédiés** : `Order`, `GroupOrder`, `SourcingRequest`, `Payment`, `Cart`, `Wallet`, `GrainsTransaction`, `Reward`.

**Règles** :
- Prix calculé à partir de `price1688`, `exchangeRate`, `serviceFeeRate` (10%), `insuranceRate` (2%), shipping.
- Seuls les produits avec `channels: ['marketplace']` ou sans canal explicite apparaissent ici.
- Livraison : express 3j, fret aérien 15j, maritime 60j avec éligibilité configurable.

### 4.3 Xeuy Bi (mobile app)

**Écrans clés** :
- Consumer : home, mes demandes, offres, mission, chat, notation, paiement
- Provider : missions proches, offres, mission active, KYC, wallet, profil

**Modèles dédiés** : `ServiceRequest`, `Offer`, `ChatMessage`, `ServiceReview`, `KycRequest`, `Payment` (wallet/escrow).

**Règles** :
- OTP SMS + JWT.
- Missions avec statuts étendus (`assigned` → `provider_arriving` → `in_progress` → `completed`).
- Chat temps réel via Socket.io.
- KYC léger avant acceptation de missions.

---

## 5. Modèles de données partagés

### 5.1 `Product` (catalogue source unique)

Le produit est le seul modèle vraiment transverse. Il est enrichi pour supporter les trois canaux.

```ts
interface Product {
  // Identité
  name: string
  category?: string
  description?: string
  
  // Pricing multi-canal
  price?: number           // Prix public marketplace
  b2bPrice?: number        // Prix corporate B2B
  baseCost?: number        // Coût fournisseur
  marginRate?: number      // Marge ajustable
  
  // Marketplace (sourcing Chine)
  price1688?: number
  exchangeRate?: number
  serviceFeeRate?: 5 | 10 | 15
  insuranceRate?: number
  
  // Distribution
  channels: ('marketplace' | 'corporate' | 'xeuy-bi')[]
  corporateVisible: boolean
  
  // Logistique
  weightKg?: number
  grossWeightKg?: number
  netWeightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  
  // Achat groupé
  groupBuyEnabled?: boolean
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  priceTiers?: PriceTier[]
  
  // Médias & recherche
  image?: string
  gallery?: string[]
  imageEmbedding?: number[]
  
  // Flags
  isPublished: boolean
  isFeatured: boolean
  requiresQuote?: boolean
  stockStatus: 'in_stock' | 'preorder' | 'out_of_stock'
}
```

**Indexes** : `{ channels: 1, isPublished: 1 }`, `{ corporateVisible: 1, isPublished: 1 }`, `{ category: 1, isPublished: 1 }`, text search.

### 5.2 `User` (identité commune)

L’identité reste commune. Les profils spécifiques sont externalisés pour éviter le “fourre-tout”.

```ts
interface User {
  _id: ObjectId
  email: string
  username: string
  name: string
  phone?: string
  passwordHash: string
  role: 'CLIENT' | 'TECHNICIAN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  kycVerified?: boolean
  
  // Profils par domaine (collections annexes)
  marketplaceProfileId?: ObjectId  // → MarketplaceProfile
  corporateProfileId?: ObjectId    // → CorporateProfile
  providerProfileId?: ObjectId       // → ProviderProfile
}
```

**Collections annexes** (à créer progressivement) :
- `MarketplaceProfile` : `marketplaceTier`, `totalMarketplacePurchases`, `marketplaceOrderCount`, `favoriteProductIds`, `referralCode`, `grainsBalance`
- `CorporateProfile` : `companyClientId`, `company`, `address`, `city`, `country`
- `ProviderProfile` : `providerStats`, `serviceCategories`, `currentLoad`, `zone`, `kycDocuments`

### 5.3 `Order` (commande générique)

L’ordre est générique mais typé par domaine.

```ts
interface Order {
  orderId: string
  domain: 'marketplace' | 'corporate' | 'services'
  source: 'web' | 'app' | 'api'
  
  // Contexte métier
  projectId?: ObjectId      // corporate
  serviceRequestId?: ObjectId // xeuy-bi
  
  // Client
  clientId?: ObjectId
  clientName: string
  clientPhone: string
  clientEmail?: string
  
  // Items
  items: OrderItem[]
  
  // Pricing
  fees: OrderFees
  subtotal: number
  shipping: OrderShipping
  total: number
  
  // Statut
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'completed' | 'failed'
}
```

---

## 6. Boundaries API (namespaces)

Chaque sous-domaine expose ses routes sous un namespace stable.

| Namespace | Routes | Usage |
|-----------|--------|-------|
| `/api/auth/*` | `login`, `register`, `mobile/*`, `me` | Identité commune + création auto des profils |
| `/api/catalog/*` | produits, catégories, search-by-image, pricing | Catalogue public (legacy) |
| `/api/market/*` | `products`, `sourcing`, `group-orders`, `orders`, `payments` | Marketplace |
| `/api/corporate/*` | `products`, `clients`, `projects`, `quotes`, `invoices`, `interventions` | Corporate |
| `/api/services/*` | `requests`, `providers`, `offers`, `chat`, `reviews`, `matching` | Xeuy Bi |
| `/api/admin/*` | seed, backfill, config, users, catalog | Administration |
| `/api/payments/*` | initiate, webhook, release, wallet | Paiements partagés |
| `/api/upload/*` | images, documents | Uploads partagés |
| `/api/wallet` | GET | Solde points/cash + données profil marketplace |
| `/api/client-enterprise/me` | GET, PUT | Profil corporate découplé (`CorporateProfile`) |

### Routes namespaces créées dans cette phase

- `GET /api/corporate/products` — catalogue B2B : filtre `corporateVisible` + `channels: corporate` + fallback.
- `GET /api/market/products` — catalogue marketplace : filtre `channels: marketplace` + fallback.
- `GET /api/services/providers` — liste publique des prestataires avec KYC, catégories, zone et stats.

### Admin produits (back-office)

- `AdminProductManager` expose déjà les champs `channels` (marketplace / corporate / xeuy-bi) et `corporateVisible` dans l’onglet *Informations*.
- La liste de produits affiche des badges de canal (`Corporate`, `Market`, `Xeuy Bi`).
- `PATCH /api/products/bulk` supporte les actions groupées :
  - `addChannel` / `removeChannel` (mise à jour incrémentale `$addToSet` / `$pull`)
  - `corporateVisible` (booléen)

### Profils utilisateurs dans les endpoints

- `loadUserWithProfiles()` dans `src/lib/user-profiles.ts` centralise le chargement des profils.
- `syncUserToProfiles()` et `syncProfilesToUser()` assurent la cohérence bidirectionnelle pendant la migration.
- `/api/wallet` expose maintenant `profile.loyaltyTier`, `profile.referralBalance`, `profile.referralCount`, `profile.referralCode` depuis `MarketplaceProfile`.
- `/api/client-enterprise/me` lit `companyClientId` et les infos d’adresse depuis `CorporateProfile` en plus de `Client`.
- La page `/compte` utilise `MarketplaceProfile` pour `tier`, `referralCode`, `referralCount` et `referralBalance` (fallback `User` pour la rétro-compatibilité).
- Endpoints synchronisés : `PUT /api/admin/users`, `POST /api/client/request-pro`, `PATCH /api/kyc/:id`, `POST /api/order`.

**Middleware** : chaque projet Next.js possède son propre middleware. Le monolithe actuel a été refactoré : `src/lib/middleware/{domain,routes,cors,security}.ts`.

---

## 7. Pricing engine centralisé

La logique de prix est actuellement dispersée dans `/api/order`, `/api/group-orders`, `/api/admin/market/sourcing/[id]/proposal`, etc.

**Cible** : un module unique `src/lib/pricing/` avec :

```
src/lib/pricing/
├── index.ts              # exports publics
├── marketplace.ts        # getMarketplacePrice(product, qty, tier, shipping)
├── corporate.ts          # getCorporatePrice(product, qty)
├── sourcing.ts           # getSourcingPrice(price1688, exchangeRate, fees, shipping)
├── shipping.ts           # calculateShipping(products, method, settings)
├── group-buy.ts          # calculateGroupPrice(product, qty, tiers)
└── types.ts              # PricingInput, PricingResult
```

**Règles métier** :
- Les prix du client ne sont JAMAIS calculés depuis le frontend.
- Le panier est re-vérifié côté serveur à chaque commande.
- Le shipping utilise le poids réel ou le poids volumétrique (le plus élevé).
- Le maritime est bloqué côté serveur si la commande n’est pas éligible.

---

## 8. Auth & sécurité

### 8.1 Stratégie d’authentification

- JWT signé avec `JWT_SECRET` (cookie `auth-token` httpOnly, secure, sameSite lax).
- Refresh token rotation optionnelle.
- 2FA TOTP pour les comptes admin.
- OTP SMS pour l’app mobile.
- En dev, `DEV_MOBILE_TOKEN` autorisé pour les tests mobile.

### 8.2 Autorisation par rôle

| Rôle | Accès |
|------|-------|
| `CLIENT` sans `companyClientId` | Marketplace, compte, messagerie |
| `CLIENT` avec `companyClientId` | Portail entreprise (corporate) |
| `TECHNICIAN` | Tech-interface, missions Xeuy Bi |
| `PRODUCT_MANAGER` | Admin produits et catalogues |
| `ACCOUNTANT` | Admin comptabilité, factures |
| `ADMIN` / `SUPER_ADMIN` | Tout |

### 8.3 CSRF / CORS

- Protection CSRF sur toutes les routes web (`/api/*` non-mobile).
- CORS ouvert uniquement sur les routes mobile (`/api/services/*`, `/api/auth/mobile/*`, `/api/payments/*`, etc.).
- CORS restrictif sur les routes catalogue publiques.

---

## 9. Infrastructure et déploiement

### 9.1 Environnements

| Environnement | URL | Infra |
|---------------|-----|-------|
| Local | `localhost:3000` | Docker Compose |
| Staging | `staging.itvisionplus.sn` | EC2 / Vercel Preview |
| Production | `itvisionplus.sn` + `market.itvisionplus.sn` | EC2 + Vercel |

### 9.2 Services conteneurisés (Docker Compose)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
  mongo:
    image: mongo:7
    volumes: ["mongo-data:/data/db"]
  redis:
    image: redis:7-alpine
  ollama:
    image: ollama/ollama
    volumes: ["ollama:/root/.ollama"]
```

### 9.3 Variables d’environnement critiques

```bash
# Base
NODE_ENV=production
MONGODB_URI=
JWT_SECRET=
NEXT_PUBLIC_API_BASE_URL=

# Marketplace
EXCHANGE_RATE_DEFAULT=100
SERVICE_FEE_DEFAULT=10
INSURANCE_RATE_DEFAULT=2.5

# Mobile
EXPO_PUBLIC_API_BASE_URL=
DEV_MOBILE_TOKEN=

# Paiements
WAVE_API_KEY=
OM_API_URL=
OM_API_TOKEN=
FREE_MONEY_API_URL=
FREE_MONEY_API_KEY=

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# LLM local
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 10. Feuille de route de migration

### Phase 1 — Modèles de données (terminée)

- [x] Ajouter `channels` et `corporateVisible` au modèle `Product`.
- [x] Ajouter `domain` au modèle `Order`.
- [x] Créer `MarketplaceProfile`, `CorporateProfile`, `ProviderProfile`.
- [x] Lier les profils à `User` et créer les migrations de backfill.
- [x] Création automatique des profils lors de l’inscription web et mobile.
- [x] Créer les helpers `syncUserToProfiles` et `syncProfilesToUser` pour la migration progressive.
- [ ] Migrer les champs “fourre-tout” de `User` vers les profils dédiés (lecture/écriture prioritaires sur les profils, tâche longue).

### Phase 2 — API et logique métier (en cours)

- [x] Centraliser l’API publique pricing dans `src/lib/pricing/index.ts`.
- [x] Créer les namespaces API stables : `/api/corporate/products`, `/api/market/products`, `/api/services/providers`.
- [x] Refactorer le middleware : extraction de `domain.ts`, `routes.ts`, `cors.ts`, `security.ts` dans `src/lib/middleware/`.
- [x] Intégrer les profils dans les endpoints existants (`/api/wallet`, `/api/client-enterprise/me`, `/compte`).
- [x] Ajouter les champs `channels` et `corporateVisible` au `AdminProductManager` + actions groupées.
- [x] Documenter les namespaces et l’intégration des profils dans le DAT.
- [ ] Déplacer le middleware subdomain dans un reverse proxy (Nginx / Vercel) ou garder un middleware par projet.

### Phase 3 — Séparation des frontends

- [ ] Extraire `corporate-produits` et pages corporate dans `itvisionplus-sn/`.
- [ ] Extraire `market`, `produits`, `achats-groupes` dans `market-itvisionplus-sn/`.
- [ ] Garder `xeuy-bi-app/` comme app Expo indépendante.

### Phase 4 — Backend services autonomes

- [ ] Auth service (JWT, OTP, refresh).
- [ ] Catalog service (produits, catégories, embeddings, search).
- [ ] Order service (marketplace + corporate + services).
- [ ] Payment service (wallet, escrow, Mobile Money).
- [ ] ServiceRequest service (Xeuy Bi).
- [ ] Event bus léger pour synchronisation cross-domaine.

---

## 11. Recommandations immédiates

1. **Terminer la migration des modèles** : `Order.domain`, profils utilisateurs.
2. **Ne pas commencer par le split frontend** : il faut d’abord des API propres.
3. **Maintenir la compatibilité ascendante** : les anciens produits sans `channels` restent marketplace par défaut.
4. **Investir dans le pricing engine** avant d’ajouter de nouveaux types de commande.
5. **Documenter les contrats API** (OpenAPI / Swagger) dès la Phase 2.

---

## 12. Annexes

### A. Logique corporate/marketplace produit

```
Marketplace Product
        ↓
[Filter] → tech categories + corporateVisible=true
        ↓
[Price] → b2bPrice > price > baseCost * margin
        ↓
Corporate /produits
```

### B. Canaux produit

| Canal | Projet | Description |
|-------|--------|-------------|
| `marketplace` | `market.itvisionplus.sn` | Catalogue public, sourcing Chine |
| `corporate` | `itvisionplus.sn/produits` | Vitrine B2B sécurité électronique |
| `xeuy-bi` | App mobile | Pièces de rechange pour prestataires |

---

**Fin du document.**
