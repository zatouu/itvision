# Extension Chrome/Firefox - IT Vision Import

Extension navigateur pour scraper et importer des produits depuis 1688 et AliExpress vers IT Vision.

## Fonctionnalités

- **Scraping en un clic** : Bouton flottant sur les pages produit 1688/AliExpress
- **Extraction intelligente** : Titre, prix, images, variantes, MOQ, fournisseur
- **Liste d'attente** : Accumuler plusieurs produits avant export
- **Export vers API** : Envoi direct vers ton instance IT Vision
- **Anti-détection** : Respecte les limites pour éviter les blocages

## Installation

### Prérequis

Avant de charger l'extension, générer les icônes PNG :

```bash
cd extension
node generate-icons.js
```

### 1. Mode développeur (Chrome)

1. Ouvrir Chrome et aller sur `chrome://extensions/`
2. Activer **"Mode développeur"** (toggle en haut à droite)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `/extension/`
5. L'extension apparaît avec l'icône orange 🟠

### 2. Firefox (optionnel)

1. Aller sur `about:debugging`
2. Cliquer **"Ce Firefox"** → **"Charger un module complémentaire temporaire"**
3. Sélectionner le fichier `manifest.json`

## Utilisation

### Scraper un produit

1. **Naviguer** sur une page produit 1688 ou AliExpress
2. **Cliquer** le bouton orange flottant "Importer IT Vision" (en bas à droite)
3. **Ou** cliquer l'icône extension dans la barre, puis "Extraire cette page"
4. Le produit est ajouté à la liste

### Gérer les produits extraits

Cliquer l'icône extension pour ouvrir le popup :

- **Voir** les produits extraits (image, nom, prix)
- **Supprimer** un produit de la liste (×)
- **Vider** toute la liste

### Exporter vers IT Vision

1. **Configurer** l'API dans le popup :
   - URL API : `http://localhost:3000` (local) ou `https://ton-site.com`
   - Token API : Bearer token d'authentification (optionnel)

2. **Cliquer** "Exporter vers IT Vision"

3. **Résultat** affiché :
   - Nombre de produits créés
   - Nombre mis à jour (si déjà existants)
   - Erreurs éventuelles

## Structure des fichiers

```
extension/
├── manifest.json      # Configuration extension
├── background.js      # Service worker (background)
├── content.js         # Script injecté sur 1688/AliExpress
├── content.css        # Styles pour le bouton flottant
├── popup.html         # Interface popup
├── popup.js           # Logique popup
├── icons/             # Icônes (à créer)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # Ce fichier
```

## Icônes

Créer des icônes PNG (ou utiliser placeholders) :
- 16x16 : Barre d'outils
- 32x32 : Haute DPI
- 48x48 : Page extensions
- 128x128 : Store/Chrome Web Store

Exemple simple avec ImageMagick :
```bash
convert -size 128x128 xc:#f97316 -pointsize 60 -fill white -gravity center -annotate +0+0 "IT" icon128.png
convert -size 48x48 xc:#f97316 -pointsize 24 -fill white -gravity center -annotate +0+0 "IT" icon48.png
# etc...
```

## Développement

### Tester les changements

Après modification d'un fichier :
1. Aller sur `chrome://extensions/`
2. Cliquer 🔄 "Recharger" sur l'extension IT Vision
3. Rafraîchir la page 1688/AliExpress

### Debug content script

1. Ouvrir DevTools (F12) sur une page 1688/AliExpress
2. Onglet **Console** → filtrer messages `[IT Vision]`

### Debug popup

1. Clic droit sur l'icône extension
2. **"Inspecter popup"**
3. Console et Network visibles

### Debug background

1. Aller sur `chrome://extensions/`
2. Cliquer **"service worker"** (lien sur l'extension)
3. Console dédiée au background script

## Permissions requises

| Permission | Utilisation |
|------------|-------------|
| `activeTab` | Accéder à la page active pour scraping |
| `storage` | Stocker produits extraits localement |
| `clipboardWrite` | Copier données (futur) |
| Hosts 1688/AliExpress | Injection content script |
| Host IT Vision | Communication API |

## Intégration API

L'extension communique avec :
```
POST /api/scrape/bulk
Content-Type: application/json
Authorization: Bearer {token}

{
  "urls": [
    "https://detail.1688.com/offer/xxx.html",
    "https://www.aliexpress.com/item/yyy.html"
  ]
}
```

Réponse attendue :
```json
{
  "success": true,
  "summary": {
    "created": 5,
    "updated": 2,
    "failed": 0
  }
}
```

## Troubleshooting

### Extension ne s'injecte pas
- Vérifier URL : doit contenir `1688.com` ou `aliexpress.com`
- Recharger la page après installation
- Vérifier console DevTools pour erreurs

### Bouton flottant invisible
- Scroll sur la page (déclenche injection)
- Vérifier `content.css` chargé
- Désactiver/ réactiver extension

### Export vers API échoue
- Vérifier URL API accessible (CORS configuré)
- Vérifier token d'authentification
- Vérifier `/api/scrape/bulk` existe sur le serveur

### Produits non extraits
- Attendre 2-3s après chargement page (lazy load)
- Certains produits 1688 ont structure différente
- Essayer clic droit "Extraire produit IT Vision"

## Roadmap

- [ ] Export vers CSV/JSON
- [ ] Configuration catégories par défaut
- [ ] Bulk import depuis liste URLs
- [ ] Détection automatique changements prix
- [ ] Sync cloud (multi-device)
- [ ] Publication Chrome Web Store

## Licence

MIT - Utilisation libre pour IT Vision
