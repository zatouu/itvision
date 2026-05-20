# Système de Scraping Robuste via Navigateur

## Vue d'ensemble

Ce système permet de scraper les sites 1688 et AliExpress via un **véritable navigateur** (Chromium via Playwright) avec techniques d'anti-détection avancées.

## Pourquoi le scraping navigateur ?

| Problème | Solution |
|----------|----------|
| CAPTCHA / Anti-bot | User-agents réels, stealth mode |
| Blocage IP | Rotation de proxies (optionnel) |
| JavaScript dynamique | Rendu complet du DOM |
| Changements de structure | Sélecteurs multiples avec fallback |
| Rate limiting | Retries avec backoff exponentiel |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  API Routes     │────▶│  BrowserScraper  │────▶│  Playwright     │
│  /api/scrape/*  │     │  (anti-detection)│     │  + Chromium     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Import Sources │◀────│  1688/AliExpress │
│  Fallback       │     │  Extractors      │
└─────────────────┘     └──────────────────┘
```

## Fichiers clés

- `src/lib/browser-scraper.ts` - Service principal avec anti-detection
- `src/app/api/scrape/route.ts` - API routes pour le scraping
- `src/lib/import-sources.ts` - Intégration avec le système d'import existant

## API Endpoints

### 1. Preview produit
```bash
GET /api/scrape/preview?url=https://detail.1688.com/offer/xxx.html

Headers:
  Authorization: Bearer <token>  # Admin/Product Manager requis

Response:
{
  "success": true,
  "platform": "1688",
  "data": {
    "name": "Nom du produit",
    "price1688": 45.00,
    "gallery": ["https://..."],
    "supplier": { "name": "...", "verified": true },
    "moq": 10,
    "variantGroups": [...]
  },
  "meta": {
    "attempts": 1,
    "durationMs": 3500,
    "scrapedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Bulk import
```bash
POST /api/scrape/bulk

Body:
{
  "urls": [
    "https://detail.1688.com/offer/xxx.html",
    "https://www.aliexpress.com/item/yyy.html"
  ],
  "dryRun": false  // true pour preview sans sauvegarde
}

Response:
{
  "success": true,
  "results": [
    { "url": "...", "ok": true, "action": "created", "productId": "..." },
    { "url": "...", "ok": true, "action": "updated", "productId": "..." },
    { "url": "...", "ok": false, "error": "..." }
  ],
  "summary": {
    "total": 3,
    "created": 1,
    "updated": 1,
    "failed": 1,
    "dryRun": false
  }
}
```

### 3. Vérification bloquage
```bash
GET /api/scrape/preview?url=https://...&check=true

Response:
{
  "success": true,
  "url": "https://...",
  "blocked": false
}
```

## Utilisation via Import Sources

```typescript
import { searchProducts, ImportConfig } from '@/lib/import-sources'

const config: ImportConfig = {
  source: 'browser',
  options: {
    urls: [
      'https://detail.1688.com/offer/xxx.html',
      'https://www.aliexpress.com/item/yyy.html'
    ],
    headless: true,  // false pour debug visuel
    proxy: 'http://user:pass@proxy:8080'  // optionnel
  }
}

const result = await searchProducts('', 5, config)
```

## Anti-Détection implémentée

### 1. User-Agents rotatifs
```javascript
const agents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
  // ...
]
```

### 2. Viewports variables
```javascript
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  // ...
]
```

### 3. Masquage automation
```javascript
// Injecté dans chaque page
Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] })
window.chrome = { runtime: {} }
```

### 4. Comportement humain
- Scroll progressif avec pauses aléatoires
- Délai aléatoire 1-3s après chargement
- Mouvements souris réalistes (optionnel)

### 5. Arguments Chromium anti-detection
```javascript
[
  '--disable-blink-features=AutomationControlled',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
  '--no-sandbox',
  '--disable-setuid-sandbox'
]
```

## Extraction de données

### 1688 supporte :
- ✅ Titre produit
- ✅ Prix (Yuan)
- ✅ Galerie images
- ✅ Variantes/SKU
- ✅ MOQ (Minimum Order Quantity)
- ✅ Info fournisseur
- ✅ Spécifications techniques

### AliExpress supporte :
- ✅ Titre produit
- ✅ Prix
- ✅ Galerie images
- ✅ Variantes
- ✅ Info boutique
- ✅ Rating / Commandes / Avis
- ✅ Options de livraison

## Gestion des erreurs

| Erreur | Comportement |
|--------|--------------|
| Timeout | Retry avec backoff ×2 |
| CAPTCHA | Détection et rapport |
| 403/Blocked | Retry + changement UA |
| Structure changée | Fallback sur sélecteurs alternatifs |
| Proxy dead | Rotation (si configuré) |

## Configuration environnement

```bash
# Optionnel: Proxy pour rotation IP
SCRAPER_PROXY=http://user:pass@host:port

# Optionnel: Timeout personnalisé (ms)
SCRAPER_TIMEOUT=60000

# Optionnel: Nombre max retries
SCRAPER_MAX_RETRIES=3
```

## Commandes utiles

```bash
# Test scraping single URL
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/scrape/preview?url=https://detail.1688.com/offer/xxx.html"

# Bulk import
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls":["url1","url2"],"dryRun":true}' \
  http://localhost:3000/api/scrape/bulk
```

## Performance

| Métrique | Valeur typique |
|----------|----------------|
| Temps scraping | 3-6s par URL |
| Memory usage | ~150MB par instance |
| Retry automatique | Jusqu'à 3 tentatives |
| Concurrence | Séquentiel (éviter blocage) |

## Limitations connues

1. **Taobao/Tmall** - Nécessite login, non supporté
2. **Images** - Certaines peuvent nécessiter referer spoofing
3. **Vidéos** - Non extraites actuellement
4. **Stock temps réel** - Peut différer de la réalité

## Roadmap

- [ ] Support Puppeteer alternative
- [ ] Proxy rotation automatique
- [ ] Pool de browsers pour concurrence
- [ ] Détection changements structure automatique
- [ ] Cache résultats scraping (Redis)
- [ ] Mode "headful" pour debug visuel

## Sécurité

- ⚠️ Nécessite authentification admin
- ⚠️ Rate limiting recommandé
- ⚠️ Ne pas exposer publiquement
- ⚠️ Respecter ToS des sites cibles
