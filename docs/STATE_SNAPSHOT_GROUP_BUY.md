# STATE SNAPSHOT - Système Achat Groupé Client + Refactoring UI Produit

> Date: 2026-01-10  
> Branche: `add_kafka_engine`  
> Sessions: 
> - Session 1: Implémentation proposition achat groupé par client
> - Session 2: Refactoring UI/UX page produit (composants modulaires)

---

## 1. Vision UX Globale

### Parcours Client
```
Page Produit → Bouton "Proposer" → Modal Auth/Proposition → Soumission → Validation Admin → Groupe Ouvert
```

### Parcours Admin
```
Dashboard → Onglet Propositions → Review → Approve/Reject → Notification Client
```

### Points d'entrée
- **Page produit** (`/produits/[slug]`) : Bouton "Proposer un achat groupé" visible si `groupBuyEnabled === true`
- **Portail client** (`/client-portal`) : Onglet "Achats Groupés" pour suivre ses propositions/participations
- **Sidebar produit** : Affiche les achats groupés actifs (autres produits)

---

## 2. Fonctionnalités Validées

### ✅ Implémentées cette session

| Feature | Fichier | Status |
|---------|---------|--------|
| API proposition client | `/api/group-orders/propose` | ✅ |
| API achats groupés actifs | `/api/group-orders/active` | ✅ |
| API admin validation | `/api/admin/group-orders/[id]/review` | ✅ |
| API admin liste pending | `/api/admin/group-orders/pending` | ✅ |
| API client mes achats | `/api/client/group-buys` | ✅ |
| Modal Auth + Proposition | `GroupBuyProposalModal.tsx` | ✅ |
| Sidebar temps réel | `ProductSidebar.tsx` | ✅ |
| Bouton page produit | `ProductDetailExperience.tsx` | ✅ |
| Onglet portail client | `ModernClientPortal.tsx` | ✅ |

### ✅ Pré-existantes (session précédente)

| Feature | Status |
|---------|--------|
| Paliers de prix (priceTiers) disponibles pour TOUS les produits | ✅ |
| Grid 12 colonnes (5+4+3) page produit | ✅ |
| Modèle GroupOrder avec `origin`, `proposal`, `pending_approval` | ✅ |

### ✅ Implémentées Session 2 (Refactoring UI)

| Feature | Fichier | Status |
|---------|---------|--------|
| Composant galerie modulaire | `product/ProductGallery.tsx` | ✅ |
| Composant bloc prix | `product/ProductPriceBlock.tsx` | ✅ |
| Composant onglets info | `product/ProductInfoTabs.tsx` | ✅ |
| Rendu description enrichie | `product/ProductRichDescription.tsx` | ✅ |
| Index exports unifiés | `product/index.ts` | ✅ |
| Documentation architecture | `ARCHITECTURE_COMPOSANTS_PRODUIT.md` | ✅ |

**Nouvelles fonctionnalités galerie:**
- Support swipe tactile (mobile)
- Zoom interactif modal (suivre souris)
- Navigation clavier (←→ / Escape)
- Indicateurs dots mobile

**Nouvelles fonctionnalités prix:**
- Palier actif détecté automatiquement
- Calcul économies en temps réel
- Badge "MEILLEUR" sur palier optimal

**Dépendance ajoutée:** `isomorphic-dompurify` (sanitisation XSS)

---

## 3. Règles Métier Importantes

### Proposition
- **Authentification obligatoire** pour proposer
- **1 proposition max** par utilisateur par produit en `pending_approval`
- **Pas de proposition** si un groupe `open` existe déjà pour le produit
- **Produit doit avoir** `groupBuyEnabled === true`

### Validation Admin
- Seuls `ADMIN` et `SUPER_ADMIN` peuvent approuver/rejeter
- **Rejet obligatoire** avec `rejectionReason`
- Approbation passe le statut à `open`

### Participant
- Le proposant est automatiquement **1er participant**
- Sa quantité initiale = `desiredQty` de la proposition
- `paymentStatus` initial = `pending`

### Prix
- `currentUnitPrice` calculé dynamiquement selon `currentQty` et `priceTiers`
- Copie des `priceTiers` du produit au moment de la création

---

## 4. États Possibles (GroupOrder)

```
pending_approval  → Proposition client en attente validation admin
         ↓ approve
        open      → Groupe ouvert, accepte participants
         ↓ minQty atteint
       filled     → Objectif atteint, préparation commande
         ↓
      ordering    → Commande en cours auprès fournisseur
         ↓
       ordered    → Commande passée
         ↓
       shipped    → Expédié
         ↓
      delivered   → Livré
         
pending_approval → rejected (si admin refuse)
       open      → cancelled (si deadline dépassée sans minQty)
```

### Origine (`origin`)
- `admin` : Créé par un admin
- `client` : Proposé par un client

---

## 5. Hypothèses Prises

| Hypothèse | Justification |
|-----------|---------------|
| Deadline par défaut = 14 jours | Délai raisonnable pour atteindre minQty |
| `shippingMethod` = `maritime_60j` par défaut | Mode le plus économique |
| Un client peut proposer pour plusieurs produits différents | Pas de limite imposée |
| Le proposant ne peut pas retirer sa proposition | Pas de cancel côté client |
| Notification via Socket.io (rooms `user-<id>`) | Infrastructure existante |
| Devise par défaut = `FCFA` | Marché cible Afrique francophone |

---

## 6. Points NON Encore Décidés

| Point | Options possibles | Impact |
|-------|-------------------|--------|
| **Paiement** | Immédiat vs à la validation vs à la livraison | UX + Trésorerie |
| **Remboursement** si groupe annulé | Auto vs manuel vs crédit compte | Finance |
| **Modification quantité** après join | Autorisé vs figé | Complexité |
| **Limite participants** | Illimité vs maxParticipants | UX |
| **Notification admin** | Email vs push vs dashboard only | Réactivité |
| **Visibilité propositions** | Privées vs publiques | Confiance |
| **Duplicate produit** | Plusieurs groupes simultanés ou non | Gestion stock |

---

## 7. Contraintes Techniques Fixées

### Stack
- **Framework** : Next.js 15.5.2 (App Router)
- **DB** : MongoDB + Mongoose
- **Auth** : JWT (jose) via `localStorage`
- **Realtime** : Socket.io (rooms)

### Modèle GroupOrder
```typescript
// Champs clés (voir src/lib/models/GroupOrder.ts)
{
  groupId: string,           // Format: GRP-TIMESTAMP-RANDOM
  status: string,            // Voir états ci-dessus
  origin: 'admin' | 'client',
  product: { productId, name, image, basePrice, currency },
  minQty: number,
  targetQty: number,
  currentQty: number,
  priceTiers: Array<{ minQty, price, discount? }>,
  currentUnitPrice: number,
  participants: IGroupOrderParticipant[],
  deadline: Date,
  proposal?: { message, desiredQty, submittedAt, reviewedAt?, reviewedBy?, rejectionReason? }
}
```

### APIs Auth
- Header: `Authorization: Bearer <token>`
- Vérification: `jwtVerify(token, JWT_SECRET)`
- Roles: Champ `role` sur User (`CLIENT`, `TECHNICIAN`, `ADMIN`, `SUPER_ADMIN`)

### Endpoints Créés
```
POST /api/group-orders/propose        # Client propose
GET  /api/group-orders/propose        # Check si groupe existe
GET  /api/group-orders/active         # Sidebar (public)
GET  /api/admin/group-orders/pending  # Liste pending (admin)
POST /api/admin/group-orders/[id]/review # Approve/Reject (admin)
GET  /api/client/group-buys           # Mes participations (auth)
```

---

## 8. Fichiers Clés Modifiés/Créés

```
src/
├── app/api/
│   ├── group-orders/
│   │   ├── propose/route.ts          # CREATED (Session 1)
│   │   └── active/route.ts           # CREATED (Session 1)
│   ├── admin/group-orders/
│   │   ├── pending/route.ts          # CREATED (Session 1)
│   │   └── [id]/review/route.ts      # CREATED (Session 1)
│   └── client/
│       └── group-buys/route.ts       # CREATED (Session 1)
├── components/
│   ├── product/                      # CREATED (Session 2) - Composants modulaires
│   │   ├── index.ts                  # Exports unifiés
│   │   ├── ProductGallery.tsx        # Galerie avec zoom/swipe
│   │   ├── ProductPriceBlock.tsx     # Bloc prix structuré + paliers
│   │   ├── ProductInfoTabs.tsx       # Onglets description/features/etc
│   │   └── ProductRichDescription.tsx # Rendu HTML sécurisé
│   ├── GroupBuyProposalModal.tsx     # CREATED (Session 1) (~700 lines)
│   ├── ProductSidebar.tsx            # MODIFIED (Session 1 - real API)
│   ├── ProductDetailExperience.tsx   # MODIFIED (Session 1 - button + modal)
│   ├── AdminProductManager.tsx       # MODIFIED (Session 1 - priceTiers first)
│   └── client/
│       └── ModernClientPortal.tsx    # MODIFIED (Session 1 - new tab)
└── lib/models/
    └── GroupOrder.ts                 # PRE-EXISTING (verified)

docs/
└── ARCHITECTURE_COMPOSANTS_PRODUIT.md # CREATED (Session 2) - Documentation
```

---

## 9. Tests Recommandés

### Manuels (Session 1 - Achat Groupé)
1. [ ] Créer compte client → Proposer achat groupé → Vérifier création
2. [ ] Admin approuve → Vérifier statut `open`
3. [ ] Admin rejette → Vérifier `rejected` + reason
4. [ ] Sidebar affiche groupes actifs (exclut produit courant)
5. [ ] Portail client affiche mes participations

### Manuels (Session 2 - Composants UI)
1. [ ] Galerie: Swipe mobile fonctionne correctement
2. [ ] Galerie: Modal zoom avec navigation clavier
3. [ ] Prix: Palier actif change selon quantité
4. [ ] Prix: Badge "MEILLEUR" sur dernier palier
5. [ ] Onglets: Avis se chargent au clic sur l'onglet

### Automatisés (à implémenter)
- `POST /api/group-orders/propose` sans auth → 401
- `POST /api/group-orders/propose` produit sans groupBuyEnabled → 400
- `POST /api/admin/group-orders/[id]/review` sans admin → 403
- `POST /api/admin/group-orders/[id]/review` reject sans reason → 400
- ProductPriceBlock: Test calcul paliers
- ProductGallery: Test navigation
- ProductRichDescription: Test sanitisation HTML

---

## 10. Prochaines Étapes Suggérées

### Session 1 - Achats Groupés (en attente)
1. **Notification admin** : Email/Push quand nouvelle proposition
2. **UI Admin** : Page dédiée review propositions (`/admin/achats-groupes/propositions`)
3. **Paiement** : Intégrer flow paiement (partiel ou total)
4. **Rejoindre groupe** : API + UI pour rejoindre un groupe `open`
5. **Progression temps réel** : Socket.io broadcast quand participant rejoint
6. **Clôture auto** : Cron job pour passer `open` → `cancelled` si deadline dépassée

### Session 2 - Refactoring UI (prochaine étape immédiate)
1. **Intégrer ProductGallery** dans `ProductDetailExperience.tsx` (remplacer code existant)
2. **Intégrer ProductPriceBlock** dans `ProductDetailExperience.tsx`
3. **Intégrer ProductInfoTabs** dans `ProductDetailExperience.tsx`
4. **Créer ProductGroupBuyBlock** : Extraire bloc achat groupé
5. **Créer ProductInstallationRequest** : Extraire formulaire installation
6. **Tests unitaires** : Ajouter tests pour composants product
7. **Storybook** : Documenter visuellement les composants (optionnel)

### Architecture future
- **Modèle Review** : Créer schéma MongoDB pour avis clients
- **API Reviews** : Endpoints CRUD pour gérer les avis
- **Modèle Highlight** : Points clés éditables depuis l'admin
- **CMS Produit** : Éditeur WYSIWYG pour description enrichie

---

*Snapshot généré le 2026-01-10 - Prêt pour reprise par un autre agent*
