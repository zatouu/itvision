# Import produits (AliExpress / 1688 / Alibaba) — État + design robuste

## 1) État actuel (code)

### UI Admin
- Page: [src/app/admin/import-produits/page.tsx](../src/app/admin/import-produits/page.tsx)
- Onglets:
  - **Recherche par mot-clé**: appelle `GET /api/products/import?keyword=...`
  - **Import par URL**: appelle `GET /api/products/import?url=...` puis `POST /api/products/import { item }`
  - **Import en masse**: envoie `POST /api/products/import { urls, dryRun }` et affiche un résultat par URL

### API
- Route: [src/app/api/products/import/route.ts](../src/app/api/products/import/route.ts)
- AuthZ: rôle `ADMIN` ou `PRODUCT_MANAGER` (via `requireManagerRole`)
- Fonctionnalités:
  - `GET ?keyword=`: recherche AliExpress via:
    - **Apify** si `IMPORT_SOURCE=apify` et `APIFY_API_KEY` présents (fallback RapidAPI si échec)
    - **RapidAPI** sinon (`ALIEXPRESS_RAPIDAPI_KEY` requis)
  - `GET ?url=`:
    - AliExpress: parsing HTML direct (fragile mais simple)
    - 1688: parsing HTML direct + détection anti-bot (captcha/robot check)
  - `POST { item }`: upsert produit en MongoDB en utilisant `sourcing.productUrl` comme clé de déduplication
  - `POST { urls: string[], dryRun?: boolean }`: bulk import (max 20 URLs) — traite séquentiellement et renvoie `results[]` + `summary`

### Sources d’import (abstraction)
- Fichier: [src/lib/import-sources.ts](../src/lib/import-sources.ts)
- Implémenté:
  - `importFromRapidAPI` (AliExpress keyword search)
  - `importFromApify` (AliExpress keyword search via actor)
  - `searchProducts` (router)
- Incomplet / placeholder:
  - `normalizeRapidAPIItem` renvoie `item as ImportItem` (pas de mapping strict)
  - `importFromAffiliateAPI` et `importFromScraperAPI` sont des squelettes

## 2) Limites constatées

### 1688 / Alibaba
- 1688 bloque fréquemment le scraping direct (captcha / anti-bot). Dans l’état actuel, `GET ?url=` peut échouer même avec un User-Agent réaliste.
- Alibaba (alibaba.com) n’est pas supporté côté URL (pas de parseur / provider). On peut le traiter uniquement via un provider (Apify/BrightData/etc.).

### Bulk import actuel
- Traitement **synchrone** dans la requête API (pas de job asynchrone).
- Séquentiel (safe), mais:
  - risque de timeout si les pages sont lentes
  - pas de reprise si la requête est interrompue
  - pas de progression temps réel (sauf en lisant la réponse finale)

### Robustesse / Observabilité
- Pas de métriques structurées (temps par URL, cause d’échec, provider utilisé).
- La logique d’import est partagée entre `route.ts` et `import-sources.ts` (duplication et divergence possible).

## 3) Objectifs (version robuste)

1. **Importer en volume** (50 → 5 000 URLs) sans timeouts et avec reprise.
2. **Fiabilité 1688/Alibaba** via provider (proxy + anti-bot gérés).
3. **Déduplication** stable (même URL fournisseur = même produit) + mise à jour idempotente.
4. **Traçabilité**: logs structurés, status par URL, erreurs explicites, statistiques.
5. **UX admin**: progression, résultats détaillés, export CSV des échecs.

## 4) Design recommandé (phases)

### Phase A — Harden “bulk” existant (rapide)
- Conserver `POST { urls }` mais ajouter:
  - **concurrence contrôlée** (ex: 2-3 en parallèle) pour accélérer sans surcharger
  - **timeouts par URL** (ex: 20-30s) + retry léger (1 fois) sur erreurs réseau
  - **provider selection** par URL:
    - AliExpress: HTML direct OK en secours, mais préférence Apify en prod
    - 1688/Alibaba: provider only
- Ajouter un champ `provider` et `durationMs` dans `results[]`.

### Phase B — Jobs asynchrones (recommandé)

Créer un modèle Mongo `ImportJob` (ou `BulkImportJob`) avec:
- `status`: `queued | running | succeeded | failed | canceled`
- `createdByUserId`, `createdAt`, `startedAt`, `finishedAt`
- `input`: liste d’URLs (ou références), options (dryRun, source préférée)
- `progress`: `total`, `processed`, `succeeded`, `failed`
- `results`: éventuellement stockés en sous-collection / pagination (important si gros volume)

Endpoints:
- `POST /api/products/import/jobs` → crée un job (retourne `jobId`)
- `GET /api/products/import/jobs/:id` → status + progress
- `GET /api/products/import/jobs/:id/results?cursor=` → résultats paginés
- `POST /api/products/import/jobs/:id/cancel` → annulation best-effort

Exécution:
- Lancer un worker dans `server.js` (process Node long-running) ou un script `node scripts/import-worker.js`.
- Concurrence configurable `IMPORT_CONCURRENCY`.

Temps réel:
- Pousser l’avancement via Socket.IO (rooms admin) : `global.io.to('user-<id>').emit('import-job-progress', ...)`.

### Phase C — Providers (1688/Alibaba)

Option 1: **Apify** (recommandé)
- Ajouter un “URL scraper” actor (ou task) dédié pour 1688 / Alibaba.
- Le job envoie les URLs à l’actor, récupère le dataset, normalise.

Option 2: **ZenRows / Bright Data / ScraperAPI**
- Pour 1688: utiliser un rendu headless + proxy résidentiel.
- Avantage: simple à intégrer via API HTTP.
- Inconvénient: coût variable + tuning.

Recommandation:
- AliExpress keyword search: Apify ou RapidAPI.
- 1688/Alibaba URL import: Apify (best ROI) ou Bright Data si besoin enterprise.

## 5) Normalisation / mapping produit

Clé de dédup:
- `sourcing.productUrl` (déjà le cas) + éventuellement `sourcing.externalId` (offerId / productId).

Champs minimum à remplir:
- Catégorie/tagline, images, `stockStatus=preorder`, `leadTimeDays`, placeholders logistiques.

À améliorer:
- Gérer variantes proprement (variants/sku) avec un provider stable.
- Ajouter une étape de “curation” obligatoire avant publication.

## 6) Sécurité

- Garder l’authZ côté API (ADMIN/PRODUCT_MANAGER).
- Rate-limit des endpoints de job (création/lecture) pour éviter abus.
- Ne jamais logger tokens / clés provider.

## 7) Checklist de déploiement

- Variables:
  - `IMPORT_SOURCE=apify|rapidapi`
  - `APIFY_API_KEY`
  - `ALIEXPRESS_RAPIDAPI_KEY`
  - (optionnel) `APIFY_ACTOR_ID`
- Vérifier que l’environnement prod exécute bien `server.js` (worker possible).

## 8) Prochaines actions (concrètes)

1. Ajouter support Alibaba (au minimum: détection + message clair “provider requis”).
2. Créer `ImportJob` Mongo + endpoints job.
3. Ajouter worker + Socket.IO events.
4. Provider 1688/Alibaba via Apify task dédiée.
