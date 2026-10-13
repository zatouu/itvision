# ✅ Statut des P0 — Audit Paiement / Escrow / Commandes

Date : 2026-01-15  
Branche : `achat-groupes`

## Objectif
Corriger les failles **P0** identifiées lors de l’audit (accès non autorisé, exposition de données, mutations sensibles publiques) tout en gardant l’UX “achat sans compte”.

---

## ✅ P0 — Corrigés

### 1) Mutations sensibles accessibles sans admin
**Risque :** modification de statut/paiement/ressources sans autorisation.

**Correctifs :**
- Ajout d’un guard admin réutilisable et application sur les endpoints sensibles.
- Les mutations non-admin sont bloquées (sauf cas public strictement limité).

**Fichiers clés :**
- `src/lib/api-auth.ts` (helper `requireAdminApi`)
- `src/app/api/admin/escrow/route.ts`
- `src/app/api/admin/escrow/[reference]/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/quotes/route.ts`
- `src/app/api/admin/quotes/pdf/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/group-orders/[groupId]/route.ts`
- `src/app/api/group-orders/[groupId]/payment-links/route.ts`


### 2) Confirmation paiement / validations insuffisantes (achats groupés)
**Risque :** confirmation paiement manipulable, incohérences `paidAmount`, états invalides.

**Correctifs :**
- Confirmation manuelle et mutations protégées admin.
- Validation des valeurs (bornes de `paidAmount`, valeurs de `paymentStatus`, etc.).

**Fichiers clés :**
- `src/app/api/group-orders/[groupId]/route.ts`
- `src/app/api/group-orders/[groupId]/payment-links/route.ts`
- `src/lib/models/GroupOrder.ts` (persistance des champs participants liés au paiement)


### 3) Exposition d’une commande via `orderId` (PII) — accès invité sécurisé
**Risque :** fuite d’infos personnelles si un `orderId` est deviné/enumeré.

**Décision :** Option B (accès invité via **token secret** non devinable, stocké **haché** en base).

**Correctifs :**
- Génération d’un token à la création de commande.
- Stockage côté DB : `sha256(token)`.
- Lecture/mise à jour publique (adresse uniquement) possible **uniquement** avec token.
- Bypass admin conservé.

**Fichiers clés :**
- `src/lib/models/Order.ts` (champs `trackingAccessTokenHash`, `trackingAccessTokenCreatedAt`)
- `src/app/api/order/route.ts` (création + URL de confirmation tokenisée)
- `src/app/api/order/[orderId]/route.ts` (GET/PATCH protégés par token ou admin)
- `src/app/commandes/[orderId]/page.tsx` (lecture/patch avec `token` depuis l’URL)
- `src/app/panier/page.tsx` (redirect vers `confirmationUrl` tokenisée)


### 4) Récupération du lien de suivi (anti-énumération)
**Risque :** un endpoint “renvoi lien” peut révéler si une commande/email existe.

**Correctifs :**
- Réponses génériques (succès) pour éviter les fuites.
- Rate limiting.
- Rotation du token (ancien lien invalidé).

**Fichiers clés :**
- `src/app/api/order/[orderId]/resend-link/route.ts`
- `src/app/api/order/recover-link/route.ts` (récupération via email, sans connaître l’orderId)
- `src/app/retrouver-ma-commande/page.tsx` (page publique)


### 5) Compatibilité tokens legacy admin
**Risque :** auth admin incohérente / routes admin non protégées correctement.

**Correctifs :**
- Support du cookie legacy `admin-auth-token` côté serveur.
- Unification de la logique admin via helper.

**Fichier clé :**
- `src/lib/auth-server.ts`


### 6) CSRF en production — flux invité (POST/PATCH)
**Risque :** en prod, les POST/PATCH non-auth peuvent être bloqués par CSRF (403), cassant le guest checkout et le renvoi de lien.

**Correctifs :**
- Récupération du token via `GET /api/csrf` et envoi du header `x-csrf-token` sur les requêtes invitées.

**Fichiers clés :**
- `src/app/panier/page.tsx` (POST `/api/order`)
- `src/app/commandes/[orderId]/page.tsx` (PATCH adresse, POST resend)
- `src/app/retrouver-ma-commande/page.tsx` (POST recover)
- `src/app/api/csrf/route.ts` + `src/lib/csrf-protection.ts`

---

## 🟡 Sujets restants (non-P0 / améliorations)
- Expiration des tokens de suivi (ex: 90 jours) + stratégie pour commandes “anciennes” sans token (backfill/migration).
- Rate limiting persistant (actuellement mémoire) si besoin de robustesse multi-instance.
- Configuration SMTP (actuellement “best effort”, n’empêche pas les commandes mais réduit l’UX).
- Nettoyage des warnings Mongoose “Duplicate schema index” (dette technique, non bloquant).

---

## ✅ Validation
- `npm run build` passe après les correctifs (warnings non bloquants possibles : SMTP non configuré, indexes Mongoose dupliqués).
