# Plan d'architecture — 3 domaines & Portail Entreprise Premium

> Document de référence pour clarifier les frontières entre **Corporate (IT Vision)**, **Marketplace (DDM+)** et **Mobile (Xeuy Bi)**, puis feuille de route du portail B2B.
> Date : 2026-09-05 · À faire valider avant toute implémentation par les agents.
> ⚠️ Voir aussi `AUDIT_GLOBAL_SORTIE_MONOLITHE.md` (stratégie de sortie du monolithe, prioritaire).

---

## 1. Cartographie : qui possède quoi

### Domaine A — Corporate / IT Vision (B2B)
*Services aux entreprises : maintenance, interventions, projets, devis/factures, support.*

- **Pages** : `portail-entreprise/*`, `admin/*`, `admin-reports`, `validation-rapports`, `tech-interface`, `intervention`, `generateur-devis`, `services`, `realisations`, `digitalisation`, `domotique`, `maintenance-digital`, `gestion-projets`, `portail-valeur`, `contact`, `about`, `corporate-produits`
- **API** : `api/client-enterprise/*`, `api/admin/*`, `api/interventions`, `api/maintenance`, `api/projects`, `api/quotes`, `api/tickets`, `api/technicians`, `api/reports`, `api/accounting`, `api/clients`, `api/corporate`, `api/installations`, `api/scheduling`
- **Modèles** : `Client`, `CorporateProfile`, `MaintenanceContract`, `Intervention`, `Project`, `ProjectImage`, `AdminQuote`, `AdminInvoice`, `Ticket`, `Technician`, `MaintenanceActivity`, `MaintenanceReport`, `MaintenanceBid`, `MilestoneKnowledge`, `ReportPhoto`, `Lead`, `Installation`, `Service`, `AccountingEntry`, `Expense`, `Realization`, `Contact`
- **Rôles** : `TECHNICIAN`, `ACCOUNTANT`, `ADMIN`, `SUPER_ADMIN`, `CLIENT` + `companyClientId`
- **⚠️ Orphelins à supprimer** : `client-portal`, `client-portal-v2` (doublons de `portail-entreprise`, 107 Ko de code mort) et toute la stack `api/client/*`

### Domaine B — Marketplace / DDM+ (B2C import Chine)
*Vente de produits importés, achats groupés, vendeurs, fidélité grains.*

- **Pages** : `market/*`, `panier`, `checkout`, `commandes`, `achats-groupes`, `grains`, `compte/*`, `espace-vendeur`, `devenir-vendeur`, `messages`, `retrouver-ma-commande`, `payment`, `paiement`, `boutiques`, `admin-prix`, `admin-produits`
- **API** : `api/market/*`, `api/order`, `api/group-orders`, `api/grains`, `api/products`, `api/shops`, `api/vendor`, `api/reviews`, `api/returns`, `api/catalog`, `api/scrape`, `api/shipping`, `api/shipping-rates`, `api/exchange-rate`, `api/promo-slides`, `api/favorites`, `api/order-chat`
- **Modèles** : `Product`, `ProductValidated`, `ProductCategory`, `ProductQuestion`, `Order`, `GroupOrder`, `Shop`, `GrainsTransaction`, `Reward`, `Review`, `ReturnRequest`, `SourcingRequest`, `ChinaPurchase`, `MarketplaceProfile`, `OrderChatMessage`, `GroupOrderChatMessage`, `Campaign`, `PromoSlide`, `Challenge`, `UserChallenge`, `MonthlyContest`, `DailyCheckIn`
- **Rôles** : `VENDOR`, `PRODUCT_MANAGER`, `CLIENT` (sans `companyClientId`)
- **Domaine HTTP** : `market.itvisionplus.sn` (le middleware route déjà partiellement par domaine)

### Domaine C — Mobile / Xeuy Bi (mise en relation services)
*Apps consumer + provider, missions, offres, wallet, escrow.*

- **Pages web** : `mobile-app` (landing) uniquement
- **API** : `api/services/*`, `api/auth/mobile/*`, `api/wallet`, `api/payments`, `api/kyc`, `api/notifications`, `api/provider`, `api/upload`
- **Modèles** : `ServiceRequest`, `ServiceCategory`, `Offer`, `ProviderProfile`, `ProviderSubscription`, `ProviderPortfolio`, `DisputeEvidence`, `DisputeMessage`, `EscrowTransaction`, `MissionAuditLog`, `MissionUnlock`, `Payment`, `TopupPayment`, `ServiceReview`, `KycRequest`, `OtpCode`, `PushToken`
- **Rôles** : `PROVIDER`, `CLIENT` (mobile)

### Partagé (socle commun — à garder neutre)
`User`, `Notification`, `InAppNotification`, `PushSubscription`, `Activity`, `AuditLog`, `Conversation`/`Message`, `Feedback`, `PageVisit`, `AppConfig`, `ScheduledTask`, `RefreshToken`, `SentEmail`, `SupportTicket`, `Quote` (⚠️ vérifier doublon avec `AdminQuote`), `socket` (`server.js` + `lib/socket-*`).

### ⚠️ Doublons de modèles à consolider
- `Ticket` vs `SupportTicket`
- `Quote` vs `AdminQuote`
- 5 modèles de chat : `Message`, `ChatMessage`, `OrderChatMessage`, `GroupOrderChatMessage`, `DisputeMessage`

---

## 2. Diagnostic de l'amalgame

| Problème | État actuel | Impact |
|---|---|---|
| **Rôle unique** | `User.role` = un seul enum pour 3 domaines | Un `TECHNICIAN` ne peut pas être aussi client marketplace proprement ; un `PROVIDER` Xeuy hérite d'accès implicites |
| **Identités fusionnées** | `companyClientId`, `marketplaceProfileId`, `corporateProfileId`, `providerProfileId`, `vendorProfileId` sur le même User | Mélange B2B/B2C/mobile ; la logique « fallback DB » partout prouve la fragilité |
| **Portails dupliqués** | 3 portails client + 2 stacks API (`/api/client` vs `/api/client-enterprise`) | Double maintenance, divergences sécurité |
| **Socket partagé** | `server.js` unique sert Next + socket.io pour mobile ET corporate | Confusion, mais c'est en fait un atout réutilisable |
| **Scoping incohérent** | Certains filtres `clientId: userId`, d'autres `$or user+company` | Une entreprise multi-utilisateurs voit des données fragmentées |
| **Cloisonnement absent** | N'importe quel `CLIENT` authentifié peut potentiellement atteindre des endpoints d'un autre domaine si le check de profil manque | Risque réel de fuite inter-domaines |

---

## 3. Décision d'architecture — recommandation

### Conserver le monolithe, mais le rendre **modulaire par domaine**

La séparation en 3 repos/services est un mirage à ce stade : la base est partagée, les liens futurs (prestataire Xeuy achetant des pièces DDM+) exigent une identité commune. **Le bon levier est le cloisonnement logique, pas physique.**

### Keycloak : ⚠️ attention aux realms

- **Un realm par domaine** = 3 bases utilisateurs séparées → **casse votre vision** (un prestataire Xeuy ne pourrait pas acheter sur DDM+ avec le même compte). ❌
- **Un realm unique + clients par domaine** (corporate / marketplace / mobile) avec *client roles* = SSO propre, compatible avec vos liens futurs. ✅ mais ajoute de l'infra lourde (serveur, sync, migration de mots de passe hashés).
- **Recommandation pragmatique** : d'abord l'**option A ci-dessous** (autorisation par profils, sans Keycloak), Keycloak en **phase 3 optionnelle** si besoin SSO multi-apps confirmé.

### Option A — Autorisation par profils (recommandée, sans nouvelle infra)

Remplacer la logique `User.role` unique par des **capacités par domaine** dérivées des profils déjà existants :

```ts
// Ce qu'un utilisateur PEUT faire est déterminé par ses profils, pas par un rôle global
user.companyClientId        → accès portail entreprise
user.corporateProfileId     → personnel IT Vision (tech, admin...)
user.marketplaceProfileId   → acteur marketplace
user.providerProfileId      → prestataire Xeuy
user.vendorProfileId        → vendeur DDM+
```

- Un technicien corporate ET client marketplace = même User, deux profils, permissions disjointes.
- `User.role` reste pour le **personnel interne** uniquement (ADMIN, TECHNICIAN...) ; les rôles métier (`VENDOR`, `PROVIDER`, client-entreprise) deviennent des **profils**.
- Helper unique : `requireDomainAccess(user, 'corporate' | 'market' | 'xeuy')`.

---

## 4. Plan détaillé

### Phase 0 — Clarification (préalable, ~2-3j)
- [ ] **Valider ce document** et la cartographie §1 (corriger les ambiguïtés : `admin-prix`/`admin-produits` = marketplace ou corporate ? `Quote` vs `AdminQuote`, `Ticket` vs `SupportTicket`)
- [ ] Écrire `src/lib/domains.ts` : registre déclaratif `{ route: '/portail-entreprise', domain: 'corporate', requiredProfile: 'companyClientId' }` — source unique pour middleware + navigation
- [ ] Convention de nommage : préfixes de domaine dans les events socket (`corp:`, `mkt:`, `xeuy:`)

### Phase 1 — Cloisonnement (~1 sem)
- [ ] Réorganiser `src/app` en **route groups** : `(corporate)/`, `(market)/`, `(shared)/` — URLs inchangées, appartenance visible
- [ ] Middleware : réécrire `getRequiredRole()` à partir de `domains.ts` ; vérifier le **profil requis**, pas juste le rôle global
- [ ] Unifier l'auth API : un seul `verifyAuthServer()` + `requireDomainAccess()` ; supprimer le `verifyToken` dupliqué de `/api/client/*`
- [ ] **Supprimer** `client-portal`, `client-portal-v2`, `ModernClientPortal` (migrer le chat ticket temps réel dans `portail-entreprise` avant)
- [ ] Corriger le scoping : tout le B2B filtre par `clientCompanyId` (cohérent multi-users), résoudre les vieux JWT (fallback DB centralisé dans `verifyAuthServer`)
- [ ] Consolider `Ticket`/`SupportTicket`, `Quote`/`AdminQuote`

### Phase 2 — Portail Entreprise Premium (~2-3 sem)

**Design system dédié** `src/components/portal-ui/` :
- [ ] Tokens : palette propriétaire (sortir du vert+violet Tailwind — ex. encre profonde `#0B1220` + accent signature unique), Fraunces pour les titres, grille 8px, radius/ombre normalisés
- [ ] Composants : `Badge` (une seule map de statuts pour tout le portail), `KpiCard`, `PageHeader`, `EmptyState` illustré, `DataTable`, `Drawer`, `CommandPalette` (⌘K)
- [ ] White-label : logo + couleur de **l'entreprise cliente** dans la sidebar (`Client.logo` existe déjà)
- [ ] Metadata/titres propres au portail (aujourd'hui tout s'appelle « DDM+ Marketplace »)

**Dashboard « mission control »** :
- [ ] Carte héro contextuelle : prochaine intervention, technicien assigné, ETA
- [ ] Alertes proactives existantes → centre d'action (renouveler contrat, payer, répondre au devis en 1 clic)
- [ ] Skeletons serveur (`loading.tsx` + Suspense) partout

**Temps réel** (réutiliser `server.js` socket.io — pas besoin de nouvelle infra) :
- [ ] Rooms `company-{id}` ; events `corp:ticket:updated`, `corp:quote:changed`, `corp:intervention:status`
- [ ] Remplacer le polling 30s de `NotificationBell` par push socket + fallback poll
- [ ] Chat ticket live (récupérer la logique de `TicketChatModal`)

**Fonctionnel B2B premium** :
- [ ] Multi-utilisateurs : rôles internes entreprise (admin / finance / technique / lecture), invitations, gestion depuis `profil`
- [ ] Documents : e-sign devis, export comptable CSV/PDF, échéancier
- [ ] Interventions : vue calendrier + rapport photo avant/après + signature
- [ ] Contrats : jauge SLA, couverture visualisée, renouvellement assisté
- [ ] Sécurité : échapper les interpolations email, rate-limit sur `quotes/[id]/action`, journal d'audit visible client

### Phase 3 — Préparer les agents (en continu)
- [ ] **Règles de contribution** : un agent ne touche qu'un domaine ; `domains.ts` est la frontière
- [ ] Endpoints idempotents + webhooks d'événements métier (`quote.accepted`, `ticket.resolved`...)
- [ ] Audit log centralisé (le modèle `AuditLog` existe — l'alimenter sur les actions sensibles)
- [ ] Option : évaluer Keycloak **un seul realm** + 3 clients si besoin SSO confirmé — jamais de realm par domaine

---

## 5. Ordre recommandé

```
Phase 0 (ce doc validé) → Phase 1 en priorité absolue
→ Phase 2 design system d'abord, puis temps réel, puis features
→ Phase 3 transverse
```

**Ne pas** laisser des agents coder des features avant la fin de la Phase 1 : ils construiraient sur du sable (auth ambiguë, portails dupliqués).
