# Système de Scraping & Extension IT Vision

## 📦 Résumé des composants créés

### 1. Scraping Navigateur (Backend)

| Fichier | Description |
|---------|-------------|
| `src/lib/browser-scraper.ts` | Service Playwright avec anti-détection |
| `src/app/api/scrape/route.ts` | API routes pour import bulk |
| `scripts/bulk-import.ts` | Script CLI pour import 60+ produits |
| `scripts/test-scraper-1688.ts` | Test individuel avec navigateur visible |

### 2. Extension Chrome/Firefox

| Fichier | Description |
|---------|-------------|
| `extension/manifest.json` | Configuration extension MV3 |
| `extension/content.js` | Extraction côté client (1688/AliExpress) |
| `extension/content.css` | Styles bouton flottant |
| `extension/popup.html` | Interface popup |
| `extension/popup.js` | Logique popup |
| `extension/background.js` | Service worker |
| `extension/icons/*.svg` | Icônes placeholder |
| `extension/README.md` | Documentation complète |

### 3. Backup & Recovery

| Fichier | Description |
|---------|-------------|
| `scripts/backup.sh` | Backup quotidien automatique |
| `crontab.example` | Configuration cron |
| `RECOVER_60_PRODUCTS.md` | Guide récupération après crash |

---

## 🚀 Installation Extension (2 minutes)

### Étape 1: Ouvrir Chrome Extensions
```
chrome://extensions/
```

### Étape 2: Activer Mode Développeur
Toggle en haut à droite → **ON**

### Étape 3: Charger l'extension
```
"Charger l'extension non empaquetée" → Sélectionner dossier `extension/`
```

### Étape 4: Vérifier
Icône orange "IT" apparaît dans la barre d'outils 🟠

---

## 🧪 Test Scraping (Backend)

### Test avec navigateur visible:
```bash
cd /mnt/d/itvision-1

# Test un produit 1688 (navegateur s'ouvre)
npx tsx scripts/test-scraper-1688.ts https://detail.1688.com/offer/XXXXXXXX.html

# Test un produit AliExpress  
npx tsx scripts/test-scraper-1688.ts https://www.aliexpress.com/item/XXXXXXXX.html
```

### Import bulk (60 produits):
```bash
# 1. Créer fichier URLs
cat > data/mes-produits.txt << 'EOF'
https://detail.1688.com/offer/6928374657182904819.html
https://detail.1688.com/offer/6928374657182904820.html
https://www.aliexpress.com/item/1005004938271654.html
# ... etc
EOF

# 2. Mode test (dry-run)
npx tsx scripts/bulk-import.ts -f data/mes-produits.txt -d

# 3. Import réel
npx tsx scripts/bulk-import.ts -f data/mes-produits.txt
```

---

## 🔌 Utilisation Extension

### Scraper un produit (méthode 1 - Bouton flottant)
1. Naviguer sur 1688 ou AliExpress
2. Cliquer bouton orange **"Importer IT Vision"** (bas droite)
3. ✅ Produit ajouté à la liste

### Scraper un produit (méthode 2 - Popup)
1. Cliquer icône extension dans la barre
2. Cliquer **"Extraire cette page"**
3. ✅ Produit ajouté

### Exporter vers IT Vision
1. Ouvrir popup (clic icône)
2. Configurer API URL: `http://localhost:3000` (ou ton domaine)
3. Cliquer **"Exporter vers IT Vision"**
4. Les produits sont créés/mis à jour en base

---

## 📊 Architecture Complète

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTENSION NAVIGATEUR                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │ Content.js   │──────│ Background   │──────│ Popup    │  │
│  │ (extraction) │      │ (storage)    │      │ (UI)     │  │
│  └──────────────┘      └──────────────┘      └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ POST /api/scrape/bulk
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVEUR IT VISION                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  API Route: /api/scrape/bulk                            │ │
│  │  → BrowserScraper (Playwright + anti-detection)        │ │
│  │  → Extraction données                                  │ │
│  │  → Sauvegarde MongoDB                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration

### Variables d'environnement (optionnel)
```bash
# .env
SCRAPER_PROXY=http://proxy:8080
SCRAPER_TIMEOUT=60000
SCRAPER_MAX_RETRIES=3
```

### Configuration extension (popup)
- **API URL**: `http://localhost:3000` (dev) ou `https://ton-site.com` (prod)
- **Token API**: Bearer token si authentification requise

---

## 🔄 Backup Automatique

### Installation cron (une fois)
```bash
# Éditer crontab
crontab -e

# Ajouter ligne (backup quotidien 2h du matin)
0 2 * * * cd /home/ubuntu/itvision-1 && ./scripts/backup.sh >> /var/log/itvision-backup.log 2>&1

# Vérifier
crontab -l
```

### Backup manuel
```bash
./scripts/backup.sh
```

### Restore
```bash
./scripts/backup.sh restore backups/mongodb_backup_20240115_020000.tar.gz
```

---

## 📋 Extraction Supportée

### 1688 ✅
- [x] Titre produit
- [x] Prix (Yuan)
- [x] Galerie images (jusqu'à 10)
- [x] Variantes/SKU
- [x] MOQ (Minimum Order Quantity)
- [x] Fournisseur (nom, localisation, vérifié)
- [x] Spécifications techniques

### AliExpress ✅
- [x] Titre produit
- [x] Prix (conversion FCFA auto)
- [x] Galerie images
- [x] Variantes
- [x] Boutique (nom, rating)
- [x] Commandes totales
- [x] Nombre d'avis

---

## 🛡️ Anti-Détection

Techniques implémentées:

1. **User-Agent rotatif** - Chrome/Edge/Firefox Windows/Mac
2. **Viewport variable** - 1920x1080, 1366x768, etc.
3. **Stealth plugins** - Masquage `navigator.webdriver`
4. **Scroll humain** - Progressif avec pauses aléatoires
5. **Retry intelligent** - Backoff exponentiel
6. **Timeout adaptatif** - Attente chargement dynamique

---

## 🐛 Troubleshooting

### Extension non visible
- Vérifier `chrome://extensions/` → Mode développeur ON
- Recharger la page 1688/AliExpress
- Vérifier console DevTools pour erreurs

### Scraping échoue
- Réduire concurrence: `-c 1` (au lieu de 3)
- Vérifier URL accessible manuellement
- Essayer `--resume` pour reprendre

### Export vers API fail
- Vérifier CORS configuré sur `/api/scrape/bulk`
- Vérifier token d'authentification
- Tester avec `curl` direct

---

## 📝 Fichiers créés

```
/mnt/d/itvision-1/
├── extension/
│   ├── manifest.json          # ✅ Config extension
│   ├── content.js             # ✅ Extraction page
│   ├── content.css            # ✅ Styles
│   ├── popup.html             # ✅ Interface
│   ├── popup.js               # ✅ Logique popup
│   ├── background.js          # ✅ Service worker
│   ├── icons/
│   │   ├── icon16.svg         # ✅ Icône toolbar
│   │   ├── icon32.svg         # ✅ Haute DPI
│   │   ├── icon48.svg         # ✅ Extensions page
│   │   └── icon128.svg        # ✅ Store
│   └── README.md              # ✅ Documentation
├── src/lib/browser-scraper.ts # ✅ Service Playwright
├── src/app/api/scrape/route.ts # ✅ API routes
├── scripts/
│   ├── bulk-import.ts         # ✅ Import bulk CLI
│   ├── test-scraper-1688.ts   # ✅ Test individuel
│   └── backup.sh              # ✅ Backup auto
├── crontab.example            # ✅ Config cron
├── RECOVER_60_PRODUCTS.md     # ✅ Guide récupération
└── docs/SCRAPING_NAVIGATEUR.md # ✅ Architecture
```

---

## 🎯 Prochaines étapes pour récupérer tes 60 produits

1. **Créer fichier URLs** `data/mes-60-produits.txt` avec tes URLs
2. **Tester** `npx tsx scripts/bulk-import.ts -f data/mes-60-produits.txt -d`
3. **Importer** `npx tsx scripts/bulk-import.ts -f data/mes-60-produits.txt`
4. **Setup backup** `crontab crontab.example`

Tu as besoin d'aide pour récupérer les URLs depuis ton historique ou tu les as déjà?
