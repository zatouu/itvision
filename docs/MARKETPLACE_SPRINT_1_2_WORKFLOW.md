# Marketplace — Sprint 1 & 2 : commande, paiement et achats groupés

Ce document résume les renforcements appliqués au workflow marketplace et achats groupés.

## Objectif

Sécuriser le checkout, harmoniser les statuts de paiement et rendre le workflow d'achat groupé exploitable de bout en bout : participation, objectif atteint, paiement participant, suivi admin, rappels et expiration.

## 1. Checkout marketplace sécurisé

### Endpoint concerné

- `POST /api/order`

### Garanties ajoutées

- Les prix du panier ne sont plus considérés comme source de vérité.
- Chaque produit envoyé par le panier est rechargé depuis MongoDB via `Product.find(...)`.
- Le calcul de prix utilise les valeurs serveur : `price`, `b2bPrice`, `price1688`, poids et dimensions venant du produit en base.
- Un produit introuvable, non publié ou en rupture (`stockStatus === 'out_of_stock'`) bloque la commande.
- Le tier marketplace (`standard`, `pro`, `reseller`, `partner`) reste résolu côté serveur depuis l'authentification.

### Impact sécurité

Un client ne peut plus modifier localement `price`, `b2bPrice` ou le poids produit dans le navigateur pour payer moins cher.

## 2. Statut paiement PayDunya harmonisé

### Endpoint concerné

- `POST /api/payment/paydunya/callback`

### Règle

- Commandes standard : `paymentStatus = 'completed'`.
- Participants achats groupés : `paymentStatus = 'paid'`.

Cette séparation respecte les enums existants :

- `Order.paymentStatus`: `pending | completed | failed`
- `GroupOrder.participants.paymentStatus`: `pending | partial | paid | refunded`

## 3. Paiement self-service pour participants

### Endpoint créé

```http
GET /api/group-orders/[groupId]/my-payment?phone=7XXXXXXXX
```

### Fonctionnement

- Le participant saisit son téléphone.
- L'API valide le numéro sénégalais.
- L'API retrouve sa participation dans le groupe.
- Si aucune référence de paiement n'existe, elle est générée.
- La réponse inclut :
  - `payment.reference`
  - `payment.amount`
  - `checkoutUrl: /paiement/checkout/[reference]`
  - résumé participant et groupe

### Usage attendu côté front

Créer une petite interface publique sur la page d'achat groupé ou une page dédiée :

1. champ téléphone ;
2. appel `GET /api/group-orders/[groupId]/my-payment?phone=...` ;
3. bouton "Payer maintenant" vers `checkoutUrl`.

## 4. Cron rappels et expiration

### Workflow GitHub Actions créé

- `.github/workflows/cron-group-orders.yml`

### Planification

- Tous les jours à `08:00 UTC`.
- Appelle :

```http
GET {APP_BASE_URL}/api/group-orders/cron/reminders?secret={CRON_SECRET}
```

### Secrets GitHub requis

Dans `Settings > Secrets and variables > Actions` :

- `APP_BASE_URL` : URL de production sans slash final.
- `CRON_SECRET` : même valeur que la variable `.env` `CRON_SECRET`.

## 5. Admin achats groupés : suivi paiement

### Page concernée

- `/admin/achats-groupes`

### Ajouts

- Colonne `Paiements` dans la table principale.
- Affichage `X/Y payés`.
- Barre de progression paiement.
- Montant encaissé visible par groupe.
- Confirmation avant de lancer la commande fournisseur si des participants n'ont pas payé.
- Filtre paiement : tous, avec impayés, partiels, aucun paiement, tous payés.
- `paymentSummary` calculé côté API admin pour fiabiliser les totaux et ratios.
- Garde-fou serveur : le passage `filled → ordering` avec impayés retourne `409 requiresConfirmation` tant que l'admin n'a pas confirmé explicitement.
- La mise à jour manuelle d'un participant vers `paid` aligne le montant payé au total si aucun montant n'est fourni et déclenche la notification de confirmation une seule fois.

## 6. Passage `draft → open`

### Page concernée

- `/admin/achats-groupes`

### Ajout

- Bouton `Publier` pour les groupes en brouillon.
- Transition réalisée via `PATCH /api/group-orders/[groupId]` avec `status: 'open'`.

## 7. Découplage achat groupé et achat Chine

### Objectif

Quand un achat groupé passe en commande, l'admin doit piloter une opération d'achat Chine distincte du groupe commercial.

### Implémentation

- `ChinaPurchase` porte le workflow opérationnel : 1688, Alipay, réception Guangzhou, contrôle qualité, remise fret Chine-Dakar.
- `GroupOrder` conserve seulement un résumé `chinaPurchase` pour affichage rapide.
- Un `ChinaPurchase` est créé automatiquement au passage vers `ordering` ou `ordered`.
- Données suivies côté `ChinaPurchase` :
  - source commerciale (`group_order`, `order` ou `manual`) ;
  - plateforme (`1688`, `taobao`, `alibaba`, `manual`) ;
  - commande plateforme ;
  - vendeur ;
  - paiement Alipay ;
  - réception par collaborateur à Guangzhou ;
  - contrôle qualité ;
  - remise au fret ;
  - résumé financier client.
- Le passage vers `ordered` reste protégé par le même garde-fou serveur que `ordering` si des impayés existent.
- Si un paiement arrive après création de l'achat Chine, `ChinaPurchase.customerFinancials` et le résumé `GroupOrder.chinaPurchase` sont recalculés automatiquement.

### Interface admin

- La table `/admin/achats-groupes` affiche une colonne `Fournisseur` alimentée par le résumé `chinaPurchase`.
- Le détail achat groupé affiche un bloc `Achat Chine`.
- La page `/admin/achats-chine` liste et pilote les opérations Chine.

## 8. Objectif atteint : références + notifications paiement

### Helper créé

- `src/lib/group-order-helpers.ts`
- Fonction : `assignPaymentRefsAndNotify(group)`

### Déclencheurs

La fonction est appelée quand :

- un participant rejoint et fait atteindre l'objectif (`open → filled`) ;
- un admin force le statut `filled` via `PATCH /api/group-orders/[groupId]`.

### Effets

Pour chaque participant :

- génération de `paymentReference` si absente ;
- email avec lien direct : `/paiement/checkout/[reference]` ;
- conservation du statut `pending` jusqu'au paiement réel.

## 9. Calcul automatique du transport par unité

### Endpoint concerné

- `POST /api/group-orders`

### Champ alimenté

- `shippingCostPerUnit`

### Méthode

Le calcul utilise :

- le poids produit (`weightKg`, `grossWeightKg` ou `netWeightKg`) ;
- le mode de transport choisi ;
- les tarifs configurés via `getConfiguredShippingRates()` ;
- la quantité cible du groupe (`targetQty`).

Le calcul est volontairement centralisé sur les tarifs configurés, pas sur une constante hardcodée.

## 10. Abstraction passerelle de paiement

### Objectif

Le checkout ne dépend plus directement de PayDunya. PayDunya reste l'implémentation active, mais le front et la logique métier utilisent une couche générique.

### Points d'entrée

- Front checkout : `POST /api/payment/checkout/init`
- Ancien endpoint compatible : `POST /api/payment/paydunya/init`
- Statut paiement : `GET /api/payment/status?reference=...`
- Callback actuel : `POST /api/payment/paydunya/callback`

### Services ajoutés

- `src/lib/payment-gateway.ts`
  - interface `PaymentGateway`
  - sélection du provider actif via `getActivePaymentGateway(settings)`
  - adaptateur PayDunya via `PayDunyaGateway`
- `src/lib/payment-fulfillment.ts`
  - fonction `confirmPayment(...)`
  - mise à jour des statuts achat groupé ou commande standard
  - notifications post-paiement

### Remplacer PayDunya demain

Pour ajouter Stripe, CinetPay ou un autre intermédiaire :

1. créer un adaptateur qui implémente `PaymentGateway` ;
2. l'ajouter dans `getPaymentGateway(...)` ;
3. exposer son callback provider si nécessaire ;
4. appeler `confirmPayment(...)` après vérification serveur-à-serveur du paiement.

Le checkout, les statuts, la page succès, les emails et la logique métier restent inchangés.

## Checklist de validation manuelle

- Créer une commande marketplace avec prix modifié dans le navigateur : le prix serveur doit s'appliquer.
- Tenter de commander un produit `out_of_stock` : l'API doit refuser.
- Créer un achat groupé avec transport : `shippingCostPerUnit` doit être rempli si le poids produit est connu.
- Rejoindre un achat groupé jusqu'à l'objectif : le statut doit passer à `filled` et les références doivent être générées.
- Ouvrir `/admin/achats-groupes` : la colonne paiement doit afficher les ratios.
- Appeler l'endpoint `my-payment` avec le téléphone participant : un `checkoutUrl` doit être retourné.
- Initialiser un paiement depuis `/paiement/checkout/[reference]` : l'appel doit passer par `/api/payment/checkout/init`.
- Déclencher manuellement le workflow GitHub Actions cron après configuration des secrets.
