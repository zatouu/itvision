# Règles du dépôt — à lire avant toute modification

Ce dépôt héberge **3 produits** partageant un backend Next.js + MongoDB :
- **corporate** — IT Vision B2B (portail-entreprise, interventions, contrats, admin)
- **market** — DDM+ marketplace import Chine (`market.itvisionplus.sn`)
- **xeuy** — app mobile de mise en relation de services (consumer+provider, fusion prévue en dernier sur branche dédiée)

## Frontière contractuelle

`src/lib/domains.ts` est la **source unique de vérité** : chaque page, API et modèle y est classé par domaine. Le middleware (`src/lib/middleware/routes.ts`) en dérive — ne plus éditer de listes de routes à la main.

## Règles obligatoires

1. **Un agent = un domaine.** Ne jamais importer un modèle d'un autre domaine dans une route (sauf modèles `shared`, et routes `admin`/`shared` transversales). Vérifier : `npm run test:boundaries`.
2. **Toute nouvelle route ou modèle** doit être déclaré dans `src/lib/domains.ts`, sinon `npm run test:domains` échoue.
3. **Pas de code mort** : ne pas garder de page/composant orphelin « au cas où ». Marquer `deprecated` dans le registre, supprimer.
4. **Responsivité globale** : tout composant nouveau ou modifié doit être responsive (mobile → desktop), sans exception. Pas de vue desktop-only ni de doublon mobile.
5. **Interactions inter-domaines** via événements (`<domaine>:<entité>:<action>`) ou `/api/internal/*` — jamais par import direct.
6. **Socket.io** : tout nouvel événement doit être namespacé (`corp:`, `mkt:`, `xeuy:`) — voir `src/lib/socket-events.ts`. Ne pas renommer les events legacy tant que les apps déployées les utilisent.
7. **Auth** : `verifyAuthServer()` seul helper côté API ; le scoping par profil (`companyClientId`, `providerProfileId`...) prime sur le rôle global.
8. **Portail entreprise — capacités, pas de rôle en dur.** L'accès aux actions B2B est dérivé de `companyCapabilities()` (`src/lib/domain-access.ts`) = `User.companyRole` ∩ `Client.permissions`. Côté API : `requireCompanyCapability(access, '<cap>')` après `requireDomainAccess(request, 'corporate')`. Côté page : `sessionCan(session, '<cap>')` (`getEnterpriseSession`). Ne jamais tester `companyRole` à la main.
9. **Avant de merger** : `npm run test:domains` + `npm run test:boundaries` + `npm run test:capabilities` + `npm run test:e2e` sur les domaines touchés.

## Commandes utiles

```bash
npm run test:domains        # cohérence du registre de domaines
npm run test:boundaries     # rapport violations cross-domaine (-- : --strict pour CI)
npm run test:capabilities   # règles companyRole ∩ Client.permissions (portail entreprise)
npm run test:e2e            # filet de non-régression Playwright
npm run type-check          # tsc --noEmit (0 erreur attendu avant merge)
```

### Tests E2E — piège d'environnement

`tests/helpers/db.ts` charge `.env` (pas `.env.local`) : sans `MONGODB_URI`, les
helpers se connectent à `localhost:27017` (auth requise) alors que l'app locale
tourne sur le conteneur dev `27018`. Lancer les specs avec l'URI explicite :

```bash
# Mongo dev (docker) sur 27018 — même base que le serveur Next lancé par Playwright
MONGODB_URI=mongodb://localhost:27018/itvision npx playwright test tests/marketplace --project=chromium
```

Le filet marketplace vit dans `tests/marketplace/` :
`guest-session` (anti-account-takeover), `moq` (lot minimum), `group-join-atomicity`,
`vendor-payout-atomicity`, `guest-checkout-flow` (commande invité → suivi par token),
`accounting-entry` (numérotation des écritures comptables).

Le filet corporate vit dans `tests/corporate/` :
`capabilities` (viewer ≠ owner : devis/interventions/tickets/fiche société, interrupteurs
`Client.permissions`, partage des tickets entre membres) et `sourcing` (chaîne
portail → `/api/internal/market/sourcing-request` → `AgentJob sourcing_request`).
Le serveur de test reçoit `CRON_SECRET=e2e-cron-secret` via `playwright.config.ts`
(indispensable pour les appels `/api/internal/*`).

## Migrations de données

Toujours additives et idempotentes, avec un mode `--dry-run` :

```bash
npm run migrate:ticket-company:dry   # Ticket.clientCompanyId (tickets portail legacy)
npm run migrate:user-profiles:dry    # profils par domaine
```

## IA — gateway unique et agents corporate

Toute la couche LLM passe par `src/lib/ai/gateway.ts` (ordre : **DeepSeek** →
QwenCloud → Ollama). Ne pas rappeler un fournisseur en direct depuis un module
métier : utiliser `qwenChat`/`qwenVision` (déjà branchés sur le gateway) ou
`agentModelConfig()` pour LangChain.

```bash
# Texte (jugement, rédaction) — DeepSeek en priorité
DEEPSEEK_API_KEY=...            # active DeepSeek (OpenAI-compatible)
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=...              # id exact du modèle à confirmer avec l'offre en vigueur
LLM_TEXT_PROVIDER=deepseek      # force un fournisseur (deepseek|qwencloud|ollama)
LLM_VISION_PROVIDER=qwencloud   # vision : Qwen-VL puis Ollama (llava)
```

Agents corporate (mêmes règles HITL que les agents market) :

| Job | Déclencheur | Niveau |
|---|---|---|
| `quote_draft` | rapport validé (`/api/admin/reports/validate`) | HITL → AdminQuote `draft` |
| `contract_renewal` | cron `corporate-agents` (lundi 7h) | HITL → devis de renouvellement |
| `client_digest` | cron `corporate-agents` | autonome (notif owner/admin) |

Déclenchement manuel : `POST /api/cron/maintenance { job: 'corporate-agents' }`
(header `x-cron-secret`). Les décisions s'instruisent dans `/admin/copilot`.

## Catalogue B2B — règle métier

`src/lib/market/corporate-catalog.ts` est la source unique : le catalogue
corporate (vitrine + API + futur portail) **n'expose que les produits IT Vision**.
Un produit de vendeur tiers (`shopId`) est exclu, même taggé `corporateVisible`
— ne pas contourner ce filtre, c'est une règle commerciale, pas technique.

## Mobile Xeuy (`mobile/app`) — build & OTA

- Branches : `feat/mobile-fusion` (Expo SDK 51, runtime `1.0.0`, APK ≤ 56) et
  `chore/upgrade-sdk-57` (SDK 57 / RN 0.86 / API 36, runtime `2.0.0`). On développe
  sur `feat/mobile-fusion` puis on merge dans `chore/upgrade-sdk-57`.
- Les `node_modules` diffèrent entre branches : `npm ci` dans `mobile/app` après
  chaque bascule, sinon `tsc`/`eas` échouent.
- Vérifs : `npx tsc --noEmit`, `npx jest --silent` (68 tests), `npx expo-doctor` (SDK 57).
- OTA SDK 51 : `npx eas update --channel ec2 --platform android --message "..."`.
- OTA SDK 57 : `--environment preview` est obligatoire, **et il faut charger `.env`**
  (`set -a && . ./.env && set +a`), sinon le bundle part sans
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (carte grise). Vérifier avec `grep -c -a AIzaSy`
  sur le `.hbc` de `dist/`.
- Build APK de test : `npx eas build --platform android --profile ec2 --non-interactive --no-wait`.
  Le profil garde `SENTRY_DISABLE_AUTO_UPLOAD=true` tant que l'organisation Sentry
  n'est pas configurée (sinon le build échoue à l'upload des sourcemaps).
- Les logs de build EAS sont compressés en Brotli (`zlib.brotliDecompressSync`).

## Documents de référence

- `PLAN_ARCHITECTURE_3_DOMAINES.md` — cartographie et feuille de route
- `AUDIT_GLOBAL_SORTIE_MONOLITHE.md` — stratégie de sortie du monolithe
