# 🏗️ Architecture des Moteurs Métier - IT Vision

> **Version**: 1.1.0  
> **Dernière mise à jour**: Auto-générée  
> **Statut**: 🟢 Implémentation en cours

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Infrastructure Kafka](#infrastructure-kafka)
3. [Moteurs métier](#moteurs-métier)
4. [Architecture Event-Driven (Kafka)](#architecture-event-driven-kafka)
5. [Topics Kafka](#topics-kafka)
6. [Statut d'implémentation](#statut-dimplémentation)
7. [Guide de développement](#guide-de-développement)

---

## 🎯 Vue d'ensemble

L'architecture IT Vision repose sur des **moteurs métier découplés** communiquant via **Apache Kafka** pour une approche **event-driven**. Cette architecture permet :

- ✅ **Scalabilité** : Chaque moteur peut évoluer indépendamment
- ✅ **Résilience** : Un moteur défaillant n'impacte pas les autres
- ✅ **Traçabilité** : Tous les événements sont journalisés
- ✅ **Temps réel** : Réactions instantanées aux changements
- ✅ **Extensibilité** : Ajout facile de nouveaux moteurs

---

## 🛠️ Infrastructure Kafka

### Fichiers implémentés

| Fichier | Description |
|---------|-------------|
| `src/lib/kafka/client.ts` | Client KafkaJS singleton avec producer/consumer |
| `src/lib/kafka/topics.ts` | Registre centralisé de 70+ topics |
| `src/lib/kafka/types.ts` | Interfaces TypeScript pour tous les événements |
| `src/lib/kafka/producer.ts` | Émetteurs typés par domaine (16 producers) |
| `src/lib/kafka/consumer.ts` | Classe de base + LoyaltyConsumer exemple |
| `src/lib/kafka/index.ts` | Point d'entrée du module |
| `docker/kafka/docker-compose.kafka.yml` | Stack Kafka (Zookeeper, Kafka, UI, Schema Registry) |

### Moteurs implémentés

| Fichier | Description |
|---------|-------------|
| `src/lib/engines/suggestion.ts` | Moteur de recommandation produits |
| `src/lib/engines/profitability.ts` | Moteur d'analyse de rentabilité |
| `src/lib/engines/loyalty.ts` | Moteur de fidélité (points, tiers, récompenses) |
| `src/lib/engines/index.ts` | Point d'entrée des moteurs |

---

## 🔧 Moteurs métier

### Moteurs Core (Priorité 1)

| Moteur | Code | Description | Statut |
|--------|------|-------------|--------|
| **Tarification** | `pricing-engine` | Calcul des prix, marges, promotions | 🟢 Implémenté |
| **Catalogue** | `catalog-engine` | Gestion produits, catégories, variantes | 🟢 Implémenté |
| **Commandes** | `order-engine` | Cycle de vie des commandes | 🟡 Partiel |
| **Facturation** | `billing-engine` | Devis, factures, avoirs | 🟡 Partiel |
| **Stock** | `inventory-engine` | Gestion des stocks et alertes | 🔴 À faire |

### Moteurs Business (Priorité 2)

| Moteur | Code | Description | Statut |
|--------|------|-------------|--------|
| **Fidélité** | `loyalty-engine` | Points, niveaux, récompenses | 🟢 Implémenté |
| **Rentabilité** | `profitability-engine` | Marges, coûts, P&L par produit | 🟢 Implémenté |
| **Suggestions** | `recommendation-engine` | Produits similaires, cross-sell, upsell | � Implémenté |
| **Promotions** | `promotion-engine` | Codes promo, soldes, bundles | 🔴 À faire |
| **Achats groupés** | `group-buy-engine` | Groupage commandes, paliers prix | 🟢 Implémenté |

### Moteurs Support (Priorité 3)

| Moteur | Code | Description | Statut |
|--------|------|-------------|--------|
| **Notifications** | `notification-engine` | Email, SMS, Push, WhatsApp | 🟡 Partiel |
| **Paiements** | `payment-engine` | Intégrations paiement (Orange, Wave) | 🔴 À faire |
| **Livraison** | `shipping-engine` | Calcul frais, suivi colis | 🟢 Implémenté |
| **Marketplace Tech** | `technician-engine` | Missions, offres, assignations | 🟢 Implémenté |
| **Avis clients** | `review-engine` | Notes, commentaires, modération | 🔴 À faire |

### Moteurs Analytics (Priorité 4)

| Moteur | Code | Description | Statut |
|--------|------|-------------|--------|
| **Analytics** | `analytics-engine` | KPIs, dashboards, rapports | 🟡 Partiel |
| **Recherche** | `search-engine` | Recherche full-text, filtres, facettes | 🟡 Partiel |
| **Fraude** | `fraud-engine` | Détection anomalies, scoring risque | 🔴 À faire |
| **CRM** | `customer-engine` | Profils clients, segmentation | 🔴 À faire |

---

## 🔄 Architecture Event-Driven (Kafka)

### Pourquoi Kafka ?

```
┌─────────────────────────────────────────────────────────────────┐
│                     AVANTAGES KAFKA                             │
├─────────────────────────────────────────────────────────────────┤
│ • Découplage total entre producteurs et consommateurs           │
│ • Persistance des événements (replay possible)                  │
│ • Scalabilité horizontale (partitions)                          │
│ • Garantie de livraison (at-least-once / exactly-once)          │
│ • Ordering garanti par partition                                │
│ • Haute disponibilité (réplication)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Flux d'événements type

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│   API    │───▶│  Kafka   │───▶│ Consumer │
│  Action  │    │  Route   │    │  Topic   │    │  Engine  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                               │
                     │         ┌──────────┐          │
                     └────────▶│ MongoDB  │◀─────────┘
                               └──────────┘
```

---

## 🗺️ Schéma d'architecture

```
                            ┌─────────────────────────────────────┐
                            │           CLIENTS                   │
                            │   (Web / Mobile / API Partners)     │
                            └──────────────┬──────────────────────┘
                                           │
                            ┌──────────────▼──────────────────────┐
                            │         NEXT.JS APP                 │
                            │    (API Routes + SSR + Socket.IO)   │
                            └──────────────┬──────────────────────┘
                                           │
                 ┌─────────────────────────┼─────────────────────────┐
                 │                         │                         │
        ┌────────▼────────┐     ┌──────────▼──────────┐    ┌────────▼────────┐
        │   KAFKA BROKER  │     │      MONGODB        │    │    REDIS        │
        │  (Event Stream) │     │   (Persistence)     │    │   (Cache)       │
        └────────┬────────┘     └─────────────────────┘    └─────────────────┘
                 │
    ┌────────────┼────────────┬────────────┬────────────┬────────────┐
    │            │            │            │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Pricing│   │Catalog│   │ Order │   │Billing│   │Loyalty│   │ ... │
│Engine │   │Engine │   │Engine │   │Engine │   │Engine │   │      │
└───────┘   └───────┘   └───────┘   └───────┘   └───────┘   └───────┘
```

---

## 📨 Topics Kafka

### Convention de nommage

```
{domain}.{entity}.{action}

Exemples:
- catalog.product.created
- order.order.placed
- billing.invoice.generated
- loyalty.points.earned
```

### Topics par domaine

#### 🏷️ Catalog Domain
```
catalog.product.created       # Nouveau produit ajouté
catalog.product.updated       # Produit modifié
catalog.product.deleted       # Produit supprimé
catalog.product.viewed        # Produit consulté (analytics)
catalog.variant.created       # Variante ajoutée
catalog.category.updated      # Catégorie modifiée
```

#### 💰 Pricing Domain
```
pricing.price.calculated      # Prix calculé
pricing.margin.updated        # Marge modifiée
pricing.settings.changed      # Paramètres globaux changés
pricing.tier.activated        # Palier de prix atteint
```

#### 🛒 Order Domain
```
order.cart.updated            # Panier modifié
order.order.placed            # Commande passée
order.order.confirmed         # Commande confirmée
order.order.shipped           # Commande expédiée
order.order.delivered         # Commande livrée
order.order.cancelled         # Commande annulée
order.order.refunded          # Commande remboursée
```

#### 📄 Billing Domain
```
billing.quote.created         # Devis créé
billing.quote.accepted        # Devis accepté
billing.invoice.generated     # Facture générée
billing.invoice.paid          # Facture payée
billing.invoice.overdue       # Facture en retard
billing.credit.issued         # Avoir émis
```

#### 🎁 Loyalty Domain
```
loyalty.points.earned         # Points gagnés
loyalty.points.redeemed       # Points utilisés
loyalty.tier.upgraded         # Niveau augmenté
loyalty.tier.downgraded       # Niveau diminué
loyalty.reward.unlocked       # Récompense débloquée
```

#### 👥 Group Buy Domain
```
groupbuy.group.created        # Groupe créé
groupbuy.participant.joined   # Participant rejoint
groupbuy.threshold.reached    # Seuil atteint
groupbuy.group.closed         # Groupe clôturé
groupbuy.group.expired        # Groupe expiré
```

#### 📦 Inventory Domain
```
inventory.stock.updated       # Stock mis à jour
inventory.stock.low           # Stock bas (alerte)
inventory.stock.depleted      # Rupture de stock
inventory.reorder.suggested   # Réapprovisionnement suggéré
```

#### 🔔 Notification Domain
```
notification.email.sent       # Email envoyé
notification.sms.sent         # SMS envoyé
notification.push.sent        # Push notification envoyée
notification.whatsapp.sent    # WhatsApp envoyé
```

#### 🔧 Technician Domain
```
technician.mission.created    # Mission créée
technician.bid.placed         # Offre déposée
technician.mission.assigned   # Mission assignée
technician.mission.completed  # Mission terminée
```

#### 📊 Analytics Domain
```
analytics.event.tracked       # Événement tracké
analytics.conversion.recorded # Conversion enregistrée
analytics.session.started     # Session démarrée
analytics.session.ended       # Session terminée
```

---

## ✅ Statut d'implémentation

### Légende
- 🟢 **Implémenté** : Fonctionnel en production
- 🟡 **Partiel** : Base en place, fonctionnalités manquantes
- 🔴 **À faire** : Non commencé
- 🔵 **En cours** : Développement actif

### Détail par moteur

| Moteur | API | Events | Consumer | Tests | Docs |
|--------|-----|--------|----------|-------|------|
| Pricing | 🟢 | 🔴 | 🔴 | 🔴 | 🟡 |
| Catalog | 🟢 | 🔴 | 🔴 | 🔴 | 🟡 |
| Order | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Billing | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Inventory | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Loyalty | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Profitability | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Recommendation | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Promotion | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Group Buy | 🟢 | 🔴 | 🔴 | 🔴 | 🟡 |
| Notification | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Payment | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Shipping | 🟢 | 🔴 | 🔴 | 🔴 | 🟡 |
| Technician | 🟢 | 🟡 | 🔴 | 🔴 | 🔴 |
| Review | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Analytics | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Search | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Fraud | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Customer | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |

---

## 🛠️ Guide de développement

### Structure des fichiers par moteur

```
src/
├── engines/
│   ├── pricing/
│   │   ├── index.ts              # Export principal
│   │   ├── pricing.service.ts    # Logique métier
│   │   ├── pricing.events.ts     # Définition des événements
│   │   ├── pricing.consumer.ts   # Consumer Kafka
│   │   ├── pricing.producer.ts   # Producer Kafka
│   │   ├── pricing.types.ts      # Types TypeScript
│   │   └── pricing.test.ts       # Tests unitaires
│   ├── catalog/
│   ├── order/
│   └── ...
├── lib/
│   ├── kafka/
│   │   ├── client.ts             # Client Kafka singleton
│   │   ├── producer.ts           # Producer générique
│   │   ├── consumer.ts           # Consumer générique
│   │   └── topics.ts             # Registry des topics
│   └── ...
└── app/
    └── api/
        ├── pricing/
        ├── catalog/
        └── ...
```

### Créer un nouvel événement

```typescript
// src/engines/pricing/pricing.events.ts
import { BaseEvent } from '@/lib/kafka/types'

export interface PriceCalculatedEvent extends BaseEvent {
  type: 'pricing.price.calculated'
  payload: {
    productId: string
    baseCost: number
    marginRate: number
    serviceFeeRate: number
    insuranceRate: number
    finalPrice: number
    currency: string
    calculatedAt: string
  }
}

export const emitPriceCalculated = async (data: PriceCalculatedEvent['payload']) => {
  await kafkaProducer.send({
    topic: 'pricing.price.calculated',
    messages: [{
      key: data.productId,
      value: JSON.stringify({
        type: 'pricing.price.calculated',
        payload: data,
        timestamp: new Date().toISOString()
      })
    }]
  })
}
```

### Créer un consumer

```typescript
// src/engines/loyalty/loyalty.consumer.ts
import { kafkaConsumer } from '@/lib/kafka/consumer'

export const startLoyaltyConsumer = async () => {
  await kafkaConsumer.subscribe({
    topics: ['order.order.placed', 'order.order.delivered']
  })

  await kafkaConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value?.toString() || '{}')
      
      switch (topic) {
        case 'order.order.placed':
          await handleOrderPlaced(event)
          break
        case 'order.order.delivered':
          await handleOrderDelivered(event)
          break
      }
    }
  })
}

const handleOrderPlaced = async (event: any) => {
  // Logique: calculer les points de fidélité prévisionnels
}

const handleOrderDelivered = async (event: any) => {
  // Logique: créditer les points définitifs
}
```

---

## 📅 Roadmap

### Phase 1 - Fondations (Q1 2026)
- [ ] Setup Kafka (Docker Compose)
- [ ] Client Kafka TypeScript
- [ ] Premiers producers (pricing, catalog)
- [ ] Consumer pattern de base

### Phase 2 - Moteurs Core (Q2 2026)
- [ ] Order Engine complet
- [ ] Billing Engine (devis/factures)
- [ ] Inventory Engine
- [ ] Payment Engine (Orange Money, Wave)

### Phase 3 - Moteurs Business (Q3 2026)
- [ ] Loyalty Engine
- [ ] Promotion Engine
- [ ] Recommendation Engine amélioré
- [ ] Customer Engine (CRM)

### Phase 4 - Moteurs Analytics (Q4 2026)
- [ ] Analytics Engine avancé
- [ ] Profitability Engine
- [ ] Fraud Detection Engine
- [ ] Search Engine (Elasticsearch)

---

## 📚 Ressources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [KafkaJS (Client Node.js)](https://kafka.js.org/)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)

---

## 📝 Changelog

### v1.0.0 (2026-01-08)
- Création initiale de la documentation
- Définition des moteurs métier
- Définition des topics Kafka
- Guide de développement de base

