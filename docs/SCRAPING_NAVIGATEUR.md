# Scraping navigateur 1688 / AliExpress / Alibaba

> **Mise à jour** : les routes synchrones `/api/scrape/*` et
> `/api/market/sourcing/search-external` ont été **supprimées** — un scraping
> lancé dans une requête HTTP depuis l'IP datacenter du serveur était bloqué
> par 1688 quasi systématiquement. Le scraping passe désormais par les
> **agents LangGraph** (`sourcing_scan`, `sourcing_request`) exécutés par un
> worker — typiquement sur une machine à IP résidentielle.
> Voir `docs/DAT_AGENTS_IA.md` pour l'architecture agents.

## Architecture actuelle

```
┌──────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AgentJob (Mongo)    │────▶│  BrowserScraper  │────▶│  Playwright     │
│  file de travail     │     │  (stealth+profil)│     │  + Chromium     │
└──────────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                            │
        │                            ▼
│  POST /api/market/sourcing  │  fiches 1688 : nom, prix ¥, galerie,
│  /admin/sourcing (scan)     │  variantes, MOQ, fournisseur, specs
└──────────────────────┘     └──────────────────┘
```

## Fichiers clés

- `src/lib/browser-scraper.ts` — `BrowserScraper` (stealth, profil persisté, proxy), `scrape1688`, `scrapeAliExpress`, `scrapeAlibaba`, `search1688`, `search1688ViaEngines`, `searchAliExpressViaEngines`, `searchAlibabaViaEngines`, `classifySourceUrl`
- `src/lib/agents/sourcing/graph.ts` — agent veille catalogue (`sourcing_scan`)
- `src/lib/agents/sourcing/request-graph.ts` — agent « trouvez-moi » client (`sourcing_request`)
- `src/lib/agents/worker.ts` — worker de la file AgentJob
- `scripts/agent-worker.ts` — worker standalone (IP résidentielle) avec gestion du cycle de vie (PID file, `stop`/`restart`/`status`)
- `scripts/browser-login.ts` — login manuel 1688 dans le profil persisté
- `scripts/bulk-import.ts` — import manuel par liste d'URLs (script)
- `src/app/api/products/import/route.ts` — import admin ponctuel par URL (fiche directe)

## Anti-détection implémentée

- **Stealth** : `playwright-extra` + `puppeteer-extra-plugin-stealth`
  (fallback playwright vanilla si indisponible) + init script maison
  (`navigator.webdriver`, plugins, languages, chrome.runtime, permissions)
- **Profil persisté** `SCRAPER_PROFILE_DIR` + **`storage-state.json`** :
  Chromium supprime les cookies de session (`cookie2`, `_tb_token_` — ceux
  du login) au redémarrage. Le scraper exporte l'état complet via
  `storageState()` à la fermeture et le réinjecte à l'init — la session
  survit vraiment aux runs.
- **UA fixe** avec profil persisté (`SCRAPER_USER_AGENT` pour override) :
  l'empreinte navigateur est liée aux cookies — un UA aléatoire invalide
  la session.
- **`channel: 'chromium'`** : le vrai binaire Chrome en headless new-mode
  au lieu de `chrome-headless-shell` (empreinte flaggée par le 风控).
- **`--enable-automation` retiré** (`ignoreDefaultArgs`) : flag de
  détection automation immédiat.
- **Garde anti-zombie** : si un navigateur orphelin tient le lock SQLite
  du profil, les cookies basculent en mémoire et rien ne persiste —
  warning `[scraper] Profil verrouillé` au démarrage.
- **Pacing humain** (`humanDelay` 3-9s entre fiches) — un bot qui enchaîne
  en 200ms est flaggé instantanément
- **Pacing humain** (`humanDelay` 3-9s entre fiches) — un bot qui enchaîne
  en 200ms est flaggé instantanément
- **Timeout dur 120s + 1 retry** par fiche — une page qui traîne ne bloque
  pas le scan
- **Pas de contournement de CAPTCHA** : détection → arrêt propre + notif
  admin (« reconnectez la session »). Volontaire.
- **Ne pas bloquer les ressources `image`** : 1688 détecte et re-navigue.
  Seuls `media`/`font`/trackers sont abortés.

## Extraction 1688

- Nom : JSON-LD → og:title → `document.title` nettoyé (le `h1` porte le nom
  du *fournisseur*) → `cleanProductName()` retire les fragments d'entreprise
  (公司 / 厂 / co.ltd)
- Prix : sélecteurs DOM → `¥` dans le texte → **JSON embarqué**
  (`discountPriceRanges`, `skuPriceMap`, `salePrice`…) — le prix se charge
  souvent en JS dynamique
- Galerie HD (CDN alicdn, suffixes de resize nettoyés), variantes/SKU, MOQ,
  fournisseur, specs, poids/dimensions
- **Filtre qualité** : prix < 2 ¥ (acompte 定金/accessoire) et nom
  inexploitable → candidat écarté sans déclencher le détecteur de blocage

## Découverte d'URLs (ordre)

1. **URLs directes** — liens collés dans `/admin/sourcing` ou `externalUrl`
   client : `detail.1688.com/offer/*`, `aliexpress.com/item/*`,
   `alibaba.com/product-detail/*` (routées par `classifySourceUrl`)
2. **Moteurs de recherche** — `site:` sur DuckDuckGo/Bing en fetch simple
   (pas de navigateur, pas de login) :
   - **1688** : requête traduite FR→zh (`toChineseQuery`) **+ originale**
     (les marques/modèles latin — dahua, nvr, a9pro — existent verbatim)
   - **AliExpress / Alibaba.com** : requête originale telle quelle —
     listings internationaux EN, **pas de traduction**
3. **Recherche interne 1688** — **opt-in** `SCRAPER_1688_INTERNAL_SEARCH=1` :
   le 风控 Alibaba (`_____tmd_____` challenge) la mure même avec session
   authentifiée sur IP non chinoise — testé loggé, headed et headless.
   Pertinent seulement pour un worker sur IP résidentielle chinoise.

## Multi-devises

Les fiches non-1688 remontent leur prix dans la devise affichée (USD/EUR).
Le shape candidat `Product1688` porte `price1688` (prix source, toutes
sources confondues), `price1688Currency` et `platform`. Taux par devise
(`src/lib/pricing/constants.ts`, surchargeables) :

```bash
EXCHANGE_RATE_CNY=100   # 1 ¥ → FCFA
EXCHANGE_RATE_USD=600   # 1 $ → FCFA
EXCHANGE_RATE_EUR=656   # 1 € → FCFA (XOF arrimé)
```

La formule de prix reste identique quelle que soit la source :
`coût (prix × taux × qté) + frais service + assurance + transport`
(→ `totalClientPrice` — ajustable par l'admin avant envoi).

## Worker standalone (IP résidentielle)

```bash
npx playwright install chromium
npx tsx scripts/browser-login.ts     # login 1688 une fois (navigateur visible)

AGENT_WORKER_TYPES=sourcing_scan,sourcing_request npx tsx scripts/agent-worker.ts
npx tsx scripts/agent-worker.ts stop      # arrête + balaie les orphelins
npx tsx scripts/agent-worker.ts status    # état
npx tsx scripts/agent-worker.ts restart   # stop + start
```

Un seul worker à la fois (PID file `data/agent-worker.pid`). Les jobs restés
`running` après un kill sont remis en file au démarrage suivant (>15 min).

## Configuration

```bash
SCRAPER_PROFILE_DIR=data/browser-profile   # session persistée (+ storage-state.json)
SCRAPER_PROXY=http://user:pass@host:port   # optionnel
SCRAPER_HEADLESS=false                     # navigateur visible (debug/login)
SCRAPER_USER_AGENT=...                     # UA fixe du profil (override)
SCRAPER_1688_INTERNAL_SEARCH=1             # recherche interne s.1688 (IP chinoise)
AGENT_WORKER_TYPES=sourcing_scan           # filtre de types de jobs
```

## Limitations connues

1. **Recherche interne 1688** — challenge 风控 `_____tmd_____` même loggé
   (comportemental, pas juste auth) → moteurs + URLs directes = chemin nominal.
2. **Rate-limiting IP** — ~15-20 fiches anonymes avant CAPTCHA ; la session
   loggée lève largement ce plafond.
3. **Taobao/Tmall** — non supporté.
4. **Stock/prix temps réel** — peut différer au moment de l'achat réel.
