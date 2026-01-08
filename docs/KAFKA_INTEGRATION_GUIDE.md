# 🚀 Guide d'intégration Kafka - IT Vision

## État actuel

### ✅ Infrastructure créée (prête à l'emploi)

- **70+ topics Kafka** définis et typés
- **16 producers** par domaine (Catalog, Order, Pricing, etc.)
- **3 moteurs métier** implémentés (Suggestion, Profitability, Loyalty)
- **2 API routes** prêtes (`/api/suggestions`, `/api/loyalty/[customerId]`)
- **Stack Docker** Kafka complète (avec UI)

### ⚠️ Ce qui reste à faire

**Les événements Kafka ne sont pas encore émis** par les API routes existantes.
Il faut ajouter les appels aux producers dans chaque route CRUD.

---

## 🎯 Guide d'intégration étape par étape

### Étape 1 : Démarrer Kafka (optionnel pour le dev)

```bash
# Ajouter les variables d'environnement
echo "KAFKA_BROKERS=localhost:9092" >> .env
echo "KAFKA_CLIENT_ID=itvision-app" >> .env
echo "KAFKA_GROUP_ID=itvision-group" >> .env

# Démarrer la stack Kafka
npm run kafka:start

# Vérifier l'interface (http://localhost:8080)
npm run kafka:ui

# Dans un autre terminal, lancer les consumers
npm run kafka:consumers
```

**Note**: L'application fonctionne sans Kafka. Les émissions d'événements échouent silencieusement si Kafka n'est pas disponible.

---

### Étape 2 : Intégrer dans les routes existantes

#### Exemple 1 : Créer un produit avec événement Kafka

**Fichier**: `src/app/api/products/route.ts`

```typescript
import { CatalogProducer } from '@/lib/kafka'
import { NextResponse } from 'next/server'
import Product from '@/models/Product'

export async function POST(req: Request) {
  try {
    // ... votre logique existante de création ...
    const product = await Product.create(productData)

    // ✨ NOUVEAU : Émettre l'événement Kafka
    try {
      await CatalogProducer.productCreated({
        productId: product._id.toString(),
        name: product.name,
        sourceUrl: product.sourceUrl,
        baseCost: product.baseCost,
        currency: 'CNY',
        categoryId: product.category,
        variants: product.variants.map(v => ({
          variantId: v._id.toString(),
          sku: v.sku,
          price: v.price || product.baseCost,
          attributes: v.attributes || {},
        })),
      }, {
        userId: session?.user?.id,
        source: 'api',
      })
    } catch (kafkaError) {
      // Non-bloquant : l'app fonctionne même si Kafka est down
      console.warn('Kafka event failed (non-blocking):', kafkaError)
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    // ... gestion d'erreur ...
  }
}
```

#### Exemple 2 : Passer une commande

**Fichier**: `src/app/api/orders/route.ts`

```typescript
import { OrderProducer, PaymentProducer } from '@/lib/kafka'

export async function POST(req: Request) {
  // ... créer la commande ...
  const order = await Order.create(orderData)

  // Émettre l'événement
  await OrderProducer.orderPlaced({
    orderId: order._id.toString(),
    userId: order.userId,
    items: order.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      name: item.name,
    })),
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    shippingCost: order.shippingCost,
    subtotal: order.subtotal,
    taxes: order.taxes || 0,
    discount: order.discount || 0,
    total: order.total,
    paymentMethod: order.paymentMethod,
  }, {
    userId: session.user.id,
    correlationId: order._id.toString(),
  })

  // Le moteur de fidélité va automatiquement attribuer des points !
  // Le moteur de rentabilité va tracker la commande !
  
  return NextResponse.json({ success: true, data: order })
}
```

#### Exemple 3 : Vue produit (tracking)

**Fichier**: `src/app/produits/[id]/page.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { CatalogProducer } from '@/lib/kafka'

export default function ProductPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    // Émettre l'événement de vue
    fetch('/api/suggestions/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'view',
        productId: params.id,
        sessionId: getSessionId(), // À implémenter
      }),
    })
  }, [params.id])

  // ... reste du composant ...
}
```

---

### Étape 3 : Routes à intégrer (checklist)

| Route | Événement à émettre | Producteur |
|-------|---------------------|------------|
| `POST /api/products` | `catalog.product.created` | `CatalogProducer.productCreated()` |
| `PATCH /api/products/[id]` | `catalog.product.updated` | `CatalogProducer.productUpdated()` |
| `GET /api/products/[id]` | `catalog.product.viewed` | `CatalogProducer.productViewed()` |
| `POST /api/orders` | `order.order.placed` | `OrderProducer.orderPlaced()` |
| `PATCH /api/orders/[id]/status` | `order.order.confirmed/shipped/delivered` | `OrderProducer.orderConfirmed()` etc. |
| `POST /api/quotes` | `billing.quote.created` | `BillingProducer.quoteCreated()` |
| `POST /api/quotes/[id]/invoice` | `billing.invoice.generated` | `BillingProducer.invoiceGenerated()` |
| `POST /api/payments` | `payment.payment.initiated` | `PaymentProducer.paymentInitiated()` |
| `PATCH /api/payments/[id]/complete` | `payment.payment.completed` | `PaymentProducer.paymentCompleted()` |
| `POST /api/cart/add` | `order.cart.updated` | `OrderProducer.cartUpdated()` |

---

## 🎁 Avantages immédiats une fois intégré

### 1. Recommandations automatiques
Dès que les vues produits sont trackées, le moteur de suggestions fonctionne :
```typescript
// Dans votre page produit
const { data } = await fetch(`/api/suggestions?sessionId=${sessionId}&productId=${currentId}`)
// Afficher data.products (suggestions personnalisées)
```

### 2. Fidélité automatique
Dès qu'une commande est passée, le client gagne des points :
```typescript
// Le LoyaltyConsumer écoute ORDER_PLACED et attribue automatiquement :
// - Points de base (1 point / 1000 FCFA)
// - Bonus premier achat
// - Multiplicateur de tier (Bronze → Diamant)
```

### 3. Analyse de rentabilité
```typescript
// Rapports générés automatiquement
const report = profitabilityEngine.generateReport(
  new Date('2026-01-01'),
  new Date('2026-01-31'),
  'monthly'
)
// → Marges par produit, clients les plus rentables, suggestions de prix
```

---

## 📊 Monitoring et debugging

### Kafka UI (http://localhost:8080)
- Voir tous les topics
- Inspecter les messages
- Vérifier les consumer groups
- Analyser les lags

### Logs des consumers
```bash
npm run kafka:consumers
# Affiche en temps réel :
# [Loyalty] 100 points attribués au client 123 pour commande 456
# [Suggestion] Recorded view: product-789 for session abc
# [Profitability] Order 456 recorded
```

### Statistiques des moteurs
```typescript
import { suggestionEngine, loyaltyEngine } from '@/lib/engines'

// Stats du moteur de suggestions
const suggestStats = suggestionEngine.getStats()
console.log(suggestStats)
// { sessionsTracked: 1234, productsTracked: 567, totalViews: 8910, ... }

// Stats du programme de fidélité
const loyaltyStats = loyaltyEngine.getStats()
console.log(loyaltyStats)
// { totalMembers: 234, totalPointsIssued: 45678, tierDistribution: {...} }
```

---

## 🚧 Mode dégradé (sans Kafka)

L'application **fonctionne normalement** même si Kafka n'est pas disponible :

- Les événements ne sont simplement pas émis
- Pas de recommandations personnalisées (fallback: produits populaires)
- Pas d'attribution automatique de points (peut être fait manuellement)
- Pas de tracking de rentabilité en temps réel

**C'est intentionnel** : Kafka est un "nice to have" pour les fonctionnalités avancées, pas un "must have" pour les fonctions core.

---

## 🎯 Prochaines étapes recommandées

1. **Intégrer 3 routes de base** :
   - `POST /api/products` → `productCreated`
   - `POST /api/orders` → `orderPlaced`
   - `GET /api/products/[id]` → `productViewed`

2. **Tester le système** :
   - Créer un produit → vérifier dans Kafka UI
   - Passer une commande → voir les points attribués
   - Consulter 5 produits → obtenir des suggestions

3. **Étendre progressivement** :
   - Ajouter les autres routes une par une
   - Créer de nouveaux consumers si besoin
   - Affiner les algorithmes des moteurs

---

## 📞 Support

Si vous avez des questions sur l'intégration :
- Consultez les exemples dans `src/lib/kafka/consumer.ts` (LoyaltyConsumer)
- Vérifiez les types dans `src/lib/kafka/types.ts`
- Inspectez les producers dans `src/lib/kafka/producer.ts`
