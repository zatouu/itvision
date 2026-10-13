# Recherche d'Image par TensorFlow.js

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de rechercher des produits similaires en uploadant une image. Elle utilise **TensorFlow.js** avec le modèle **MobileNet V2** pour extraire des caractéristiques visuelles (embeddings) et comparer la similarité entre images.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Architecture de la Recherche d'Image                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐  │
│   │  Image   │────▶│  MobileNet   │────▶│  Embedding   │────▶│ Cosine   │  │
│   │  Upload  │     │   V2 (AI)    │     │ (1280-dim)   │     │Similarity│  │
│   └──────────┘     └──────────────┘     └──────────────┘     └──────────┘  │
│                                                                      │       │
│                                                                      ▼       │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                     Produits Similaires (Top 12)                      │  │
│   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │  │
│   │  │ 95% │ │ 87% │ │ 76% │ │ 68% │ │ 54% │ │ 42% │  ...                │  │
│   │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Table des matières

1. [Installation](#installation)
2. [Architecture](#architecture)
3. [Utilisation](#utilisation)
4. [API Reference](#api-reference)
5. [Génération des Embeddings](#génération-des-embeddings)
6. [Intégration Frontend](#intégration-frontend)
7. [Performance & Optimisation](#performance--optimisation)
8. [Dépannage](#dépannage)

---

## Installation

### 1. Dépendances

Les dépendances sont déjà ajoutées au `package.json` :

```json
{
  "dependencies": {
    "@tensorflow/tfjs": "^4.22.0"
  },
  "devDependencies": {
    "@tensorflow/tfjs-node": "^4.22.0"
  }
}
```

Installer les dépendances :

```bash
npm install
```

### 2. Scripts disponibles

```bash
# Générer les embeddings pour tous les produits
npm run generate:embeddings

# Options disponibles
npm run generate:embeddings -- --limit 100        # Limiter à 100 produits
npm run generate:embeddings -- --category "Vidéosurveillance"  # Par catégorie
npm run generate:embeddings -- --force            # Régénérer tous les embeddings
npm run generate:embeddings -- --dry-run          # Simulation sans sauvegarde
```

---

## Architecture

### Structure des fichiers

```
src/
├── lib/
│   └── tensorflow/
│       ├── index.ts              # Point d'entrée du module
│       ├── image-features.ts     # Extraction de features & similarité
│       └── use-image-search.ts   # Hook React pour le client
├── components/
│   ├── ImageSearchModal.tsx      # Modal original (recherche basique)
│   └── TensorFlowImageSearch.tsx # Modal amélioré (TensorFlow.js)
└── app/
    └── api/
        └── catalog/
            ├── search-by-image/     # API recherche par image (upload)
            │   └── route.ts
            └── search-by-embedding/ # API recherche par embedding
                └── route.ts

scripts/
└── generate-embeddings.ts  # Script de génération des embeddings
```

### Flux de données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Mode Hybride (recommandé)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Client (Browser)                         Serveur (Next.js API)            │
│   ┌────────────────────┐                  ┌────────────────────┐            │
│   │                    │                  │                    │            │
│   │  1. Upload Image   │─────FormData────▶│  2. Receive Image  │            │
│   │                    │                  │                    │            │
│   │                    │                  │  3. Analyze with   │            │
│   │                    │                  │     basic features │            │
│   │                    │                  │                    │            │
│   │                    │                  │  4. Compare with   │            │
│   │                    │◀────JSON─────────│     product DB     │            │
│   │  5. Display        │                  │     (embeddings)   │            │
│   │     Results        │                  │                    │            │
│   │                    │                  │  5. Return sorted  │            │
│   └────────────────────┘                  │     results        │            │
│                                           └────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modèle MobileNet V2

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MobileNet V2 Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Input: [224, 224, 3]  ──▶  Convolutional Layers  ──▶  GlobalAvgPool       │
│                                                              │               │
│   ┌─────────────────────────────────────────────────────────┘               │
│   │                                                                          │
│   ▼                                                                          │
│   Output: [1280] dimensions (Feature Vector / Embedding)                     │
│                                                                              │
│   Caractéristiques extraites:                                               │
│   • Formes et contours                                                      │
│   • Textures et patterns                                                    │
│   • Couleurs dominantes                                                     │
│   • Structure spatiale                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Utilisation

### 1. Composant React (Client)

```tsx
import TensorFlowImageSearch, { 
  TensorFlowImageSearchButton 
} from '@/components/TensorFlowImageSearch'

function ProductCatalog() {
  const [isSearchOpen, setSearchOpen] = useState(false)

  return (
    <div>
      {/* Bouton pour ouvrir la recherche */}
      <TensorFlowImageSearchButton onClick={() => setSearchOpen(true)} />

      {/* Modal de recherche */}
      <TensorFlowImageSearch
        isOpen={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        onResultsFound={(results) => {
          console.log('Produits similaires:', results)
        }}
        onProductSelect={(productId) => {
          // Navigation vers le produit
          router.push(`/produits/${productId}`)
        }}
      />
    </div>
  )
}
```

### 2. Hook useImageSearch

```tsx
import { useImageSearch } from '@/lib/tensorflow'

function CustomSearch() {
  const {
    isLoading,
    isSearching,
    isModelReady,
    error,
    results,
    progress,
    backend,
    loadModel,
    searchByImage,
    extractFeatures,
    reset,
  } = useImageSearch({
    maxResults: 12,
    minSimilarity: 0.3,
    useWebGL: true,
    hybridMode: true,
  })

  // Recherche avec un fichier
  const handleFileUpload = async (file: File) => {
    const results = await searchByImage(file)
    console.log(results)
  }

  // Recherche avec une URL d'image
  const handleUrlSearch = async (url: string) => {
    const results = await searchByImage(url)
  }

  // Extraction manuelle des features
  const handleExtract = async (imageElement: HTMLImageElement) => {
    const features = await extractFeatures(imageElement)
    console.log('Embedding:', features) // [1280 dimensions]
  }
}
```

### 3. API Endpoints

#### POST /api/catalog/search-by-image

Recherche par upload d'image (analyse basique côté serveur).

```typescript
// Request
const formData = new FormData()
formData.append('image', file)
formData.append('searchText', 'caméra') // optionnel

const response = await fetch('/api/catalog/search-by-image', {
  method: 'POST',
  body: formData,
})

// Response
{
  "success": true,
  "results": [
    {
      "id": "...",
      "name": "Caméra Hikvision DS-2CD2143G2",
      "image": "/uploads/products/camera.jpg",
      "category": "Vidéosurveillance",
      "priceAmount": 125000,
      "currency": "FCFA",
      "similarity": 87
    }
  ],
  "meta": {
    "totalAnalyzed": 150,
    "matchesFound": 12,
    "detectedCategories": ["Vidéosurveillance"],
    "dominantColors": ["white", "gray"]
  }
}
```

#### POST /api/catalog/search-by-embedding

Recherche par vecteur d'embedding (plus précis, nécessite extraction côté client).

```typescript
// Request
const response = await fetch('/api/catalog/search-by-embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    embedding: [...], // Array de 1280 nombres
    topK: 12,
    minSimilarity: 0.3,
    categoryFilter: 'Vidéosurveillance', // optionnel
  }),
})

// Response
{
  "success": true,
  "results": [...],
  "meta": {
    "totalAnalyzed": 150,
    "matchesFound": 8,
    "returnedCount": 8,
    "hasEmbeddings": 120
  }
}
```

---

## Génération des Embeddings

### Script automatique

Le script `scripts/generate-embeddings.ts` génère les embeddings pour tous les produits :

```bash
# Générer pour tous les produits sans embedding
npm run generate:embeddings

# Exemple de sortie
═══════════════════════════════════════════════════════════════
  🔍 TensorFlow.js Image Embedding Generator
═══════════════════════════════════════════════════════════════
  Options:
    - Limit: all
    - Category: all
    - Force: false
    - Dry run: false
═══════════════════════════════════════════════════════════════

🔌 Connecting to MongoDB...
✅ Connected

📦 Loading MobileNet model...
✅ Model loaded. Feature layer: global_average_pooling2d

📊 Found 150 products to process

[1/150] Processing: Caméra Hikvision DS-2CD2143G2
  ✅ Success (saved)
[2/150] Processing: NVR 16 canaux
  ✅ Success (saved)
...

═══════════════════════════════════════════════════════════════
  📈 Summary
═══════════════════════════════════════════════════════════════
  ✅ Success: 142
  ❌ Failed: 3
  ⏭️  Skipped: 5
  📊 Total processed: 150
═══════════════════════════════════════════════════════════════
```

### Structure de l'embedding dans MongoDB

```javascript
// Document Product
{
  "_id": ObjectId("..."),
  "name": "Caméra Hikvision DS-2CD2143G2",
  "image": "/uploads/products/camera.jpg",
  "category": "Vidéosurveillance",
  // ... autres champs ...
  
  // Champs TensorFlow.js
  "imageEmbedding": [
    0.0234,
    -0.0156,
    0.0892,
    // ... 1280 valeurs au total
  ],
  "embeddingUpdatedAt": ISODate("2024-01-15T10:30:00Z")
}
```

---

## Intégration Frontend

### Dans ProductDetailExperience

```tsx
// src/components/ProductDetailExperience.tsx

import TensorFlowImageSearch, { 
  TensorFlowImageSearchButton 
} from './TensorFlowImageSearch'

export default function ProductDetailExperience({ product }) {
  const [isImageSearchOpen, setImageSearchOpen] = useState(false)

  return (
    <div>
      {/* Bouton de recherche visuelle dans la barre d'outils */}
      <div className="flex items-center gap-2">
        <TensorFlowImageSearchButton 
          onClick={() => setImageSearchOpen(true)} 
        />
      </div>

      {/* Modal de recherche */}
      <TensorFlowImageSearch
        isOpen={isImageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        onResultsFound={(results) => {
          // Afficher les produits similaires
          setSimilarProducts(results)
        }}
      />

      {/* Section produits similaires */}
      {similarProducts.length > 0 && (
        <section className="mt-8">
          <h2>Produits similaires (par IA)</h2>
          <div className="grid grid-cols-4 gap-4">
            {similarProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

### Dans la barre de recherche globale

```tsx
// src/components/SearchBar.tsx

import { TensorFlowImageSearchButton } from './TensorFlowImageSearch'

export default function SearchBar() {
  const [imageSearchOpen, setImageSearchOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Recherche textuelle */}
      <input 
        type="text" 
        placeholder="Rechercher un produit..."
        className="flex-1 px-4 py-2 border rounded-lg"
      />
      
      {/* Recherche par image */}
      <TensorFlowImageSearchButton 
        onClick={() => setImageSearchOpen(true)} 
      />

      <TensorFlowImageSearch
        isOpen={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
      />
    </div>
  )
}
```

---

## Performance & Optimisation

### Backend TensorFlow.js

| Backend | Vitesse | Support | Recommandé pour |
|---------|---------|---------|-----------------|
| WebGL | ⚡⚡⚡ | Chrome, Firefox, Edge | Production client |
| WebGPU | ⚡⚡⚡⚡ | Chrome (flag) | Futur |
| CPU | ⚡ | Tous navigateurs | Fallback |
| WASM | ⚡⚡ | Tous navigateurs | Mobile |

### Temps de traitement typiques

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Temps de traitement (WebGL)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Chargement du modèle (première fois): ~2-3 secondes                       │
│   Chargement du modèle (cache): instantané                                  │
│                                                                              │
│   Extraction de features:                                                   │
│   • Image 224x224: ~50ms                                                    │
│   • Image 1080p (resize): ~100ms                                            │
│   • Image 4K (resize): ~150ms                                               │
│                                                                              │
│   Calcul de similarité:                                                     │
│   • 100 produits: ~5ms                                                      │
│   • 1000 produits: ~20ms                                                    │
│   • 10000 produits: ~100ms                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Optimisations recommandées

1. **Compression des embeddings**
   ```typescript
   // Réduire la précision pour économiser de l'espace
   const compressed = embedding.map(val => Math.round(val * 10000) / 10000)
   // 1280 * 8 bytes = 10KB → 1280 * 4 bytes = 5KB par produit
   ```

2. **Indexation MongoDB** (pour grands catalogues)
   ```javascript
   // Créer un index 2dsphere pour la recherche vectorielle (MongoDB 7.0+)
   db.products.createIndex(
     { "imageEmbedding": "vector" },
     { 
       name: "image_embedding_vector",
       vectorOptions: { type: "cosine", dimensions: 1280 }
     }
   )
   ```

3. **Cache côté client**
   ```typescript
   // Le modèle est automatiquement mis en cache par le navigateur
   // via IndexedDB après le premier chargement
   ```

4. **Lazy loading du modèle**
   ```typescript
   // Ne charger le modèle que quand l'utilisateur ouvre la recherche
   const { loadModel } = useImageSearch()
   
   const handleOpenSearch = async () => {
     setOpen(true)
     await loadModel() // Charger à la demande
   }
   ```

---

## Dépannage

### Problèmes courants

#### 1. "WebGL not available"

**Cause**: Le navigateur ne supporte pas WebGL ou il est désactivé.

**Solution**: 
```typescript
// Le hook gère automatiquement le fallback vers CPU
const { backend } = useImageSearch({ useWebGL: true })
// backend sera 'cpu' si WebGL n'est pas disponible
```

#### 2. "Model loading failed"

**Cause**: Problème de réseau ou CORS.

**Solution**:
- Vérifier la connexion internet
- Si le modèle est hébergé localement, configurer les headers CORS

#### 3. "Embedding dimension mismatch"

**Cause**: L'embedding stocké n'a pas la bonne dimension.

**Solution**:
```bash
# Régénérer les embeddings avec --force
npm run generate:embeddings -- --force
```

#### 4. "Out of memory"

**Cause**: Trop de tensors non libérés.

**Solution**:
```typescript
// Toujours utiliser tf.tidy() pour le nettoyage automatique
const result = tf.tidy(() => {
  const tensor = tf.browser.fromPixels(image)
  // ... opérations
  return tensor.dataSync()
})

// Ou libérer manuellement
tensor.dispose()
```

### Logs de debug

Activer les logs TensorFlow.js :
```typescript
// Dans le navigateur
localStorage.setItem('debug', 'tfjs:*')

// Vérifier l'état de la mémoire
import * as tf from '@tensorflow/tfjs'
console.log(tf.memory())
// { numTensors: 42, numDataBuffers: 38, numBytes: 1048576 }
```

---

## Ressources

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MobileNet V2 Paper](https://arxiv.org/abs/1801.04381)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [WebGL Specification](https://www.khronos.org/webgl/)

---

## Changelog

### v1.0.0 (Initial)
- ✅ Extraction de features avec MobileNet V2
- ✅ Hook React `useImageSearch`
- ✅ Composant `TensorFlowImageSearch`
- ✅ API `/api/catalog/search-by-image`
- ✅ API `/api/catalog/search-by-embedding`
- ✅ Script de génération des embeddings
- ✅ Support WebGL et CPU backends
- ✅ Mode hybride (client + serveur)
