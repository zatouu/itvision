# Configuration Admin — Achats Groupés (paramètres métier)

## Objectif

Ce document décrit la nouvelle configuration **paramétrable depuis l'admin** pour les achats groupés, afin d'éviter les valeurs codées en dur (seuils, délais, quantités, méthodes de transport, comportement de statut).

---

## Où configurer

- Interface admin: `src/app/admin/paiements/page.tsx` (onglet **Général & Features**)
- API admin: `GET/POST /api/admin/payment-settings`
- Stockage serveur: `data/payment-settings.json`
- Normalisation et garde-fous: `src/lib/payments/settings.ts`

---

## Schéma des règles achats groupés

Les règles sont stockées dans:

```json
{
  "groupOrders": {
    "enabled": true,
    "chatEnabled": true,
    "paymentLinksEnabled": true,
    "paymentManagementEnabled": true,
    "rules": {
      "defaultMinQty": 10,
      "defaultTargetQty": 50,
      "defaultMaxQty": 100,
      "defaultDeadlineDays": 14,
      "minJoinQty": 1,
      "maxJoinQtyPerParticipant": 50,
      "maxParticipantsPerGroup": 100,
      "autoFillOnTargetReached": true,
      "allowedShippingMethods": {
        "maritime_60j": true,
        "air_15j": true,
        "express_3j": true
      }
    }
  }
}
```

---

## Règles appliquées automatiquement

`src/lib/payments/settings.ts` applique des validations/sanitizations:

- bornes numériques (min/max),
- cohérence `targetQty >= minQty`,
- cohérence `defaultMaxQty >= defaultTargetQty`,
- cohérence `maxJoinQtyPerParticipant >= minJoinQty`,
- au moins une méthode de transport active (fallback maritime si toutes désactivées).

Ces garde-fous empêchent une configuration admin invalide de casser le parcours utilisateur.

---

## Impact côté API

### 1) API publique achats groupés

Fichier: `src/app/api/group-orders/route.ts`

- `GET /api/group-orders`
  - renvoie désormais un bloc `config` public:
    - `minJoinQty`
    - `maxJoinQtyPerParticipant`
    - `defaultDeadlineDays`
    - `allowedShippingMethods`
- `POST /api/group-orders`
  - applique les règles admin:
    - validation `qty` entre min/max participant,
    - deadline par défaut calculée avec `defaultDeadlineDays` si absente,
    - validation des méthodes de transport via `allowedShippingMethods`,
    - fallback `minQty/targetQty/maxQty` via les règles admin si non définis sur le produit,
    - `maxParticipants` initialisé avec `maxParticipantsPerGroup`,
    - passage auto en `filled` piloté par `autoFillOnTargetReached`.

### 2) API détail d'un groupe (rejoindre)

Fichier: `src/app/api/group-orders/[groupId]/route.ts`

- `POST /api/group-orders/[groupId]`
  - validation `qty` entre `minJoinQty` et `maxJoinQtyPerParticipant`,
  - contrôle du max participants avec fallback sur `maxParticipantsPerGroup`,
  - passage auto `open -> filled` contrôlé par `autoFillOnTargetReached`.

### 3) API admin achats groupés (création admin)

Fichier: `src/app/api/admin/group-orders/route.ts`

- `POST /api/admin/group-orders`
  - applique les defaults admin si non fournis:
    - `minQty`, `targetQty`, `deadline`, `maxParticipants`,
  - limite les méthodes de transport à celles autorisées dans settings.

### 4) API liens de paiement

Fichier: `src/app/api/group-orders/[groupId]/payment-links/route.ts`

- la progression renvoyée est désormais calculée sur `targetQty` (objectif métier),
  au lieu de `minQty`.

---

## Impact côté UI

### Admin

Fichier: `src/app/admin/paiements/page.tsx`

Ajout d'un bloc **Règles métiers paramétrables**:

- quantités par groupe: min / cible / max,
- délai par défaut (jours),
- quantités min/max par participant,
- participants max par groupe,
- activation/désactivation du passage auto à `filled`,
- activation/désactivation des méthodes de transport autorisées.

### Public (page achats groupés)

Fichier: `src/app/achats-groupes/page.tsx`

- consomme `config` retourné par `GET /api/group-orders`,
- initialise le formulaire de création avec deadline et transport selon la config,
- applique bornes min/max sur quantité dans l'UI,
- empêche la soumission hors bornes configurées.

---

## Notes de compatibilité

- Les anciennes instances de `payment-settings.json` sans bloc `groupOrders.rules` restent compatibles:
  la lecture fusionne automatiquement avec les defaults.
- Les routes API existantes restent disponibles; seule la logique métier est désormais pilotée par l'admin.

---

## Recommandation opérationnelle

Après mise en production:

1. Ouvrir `Admin > Paiements > Général & Features`.
2. Ajuster les règles selon votre modèle opérationnel (B2B/revente/logistique).
3. Sauvegarder et vérifier un scénario complet:
   - création d'un groupe,
   - participation,
   - dépassement des bornes,
   - transition de statut selon `autoFillOnTargetReached`.
