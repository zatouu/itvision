# 🎨 Variant Images - Visual Examples

## Exemple 1: T-shirt avec Tailles et Couleurs

### Avant (sans images variantes)
```
PAGE PRODUIT: "T-shirt Premium"

┌─────────────────┐
│  IMAGE PRODUIT  │  (Toujours la même, quelle que soit sélection)
│  (Générale)     │
└─────────────────┘

Sélectionner:
├─ Taille: [S] [M] [L] [XL]
└─ Couleur: [Rouge] [Bleu] [Noir]

Prix:
├─ S + Rouge: 35 $
├─ M + Bleu: 35 $  (Même image, prix uniquement)
└─ L + Noir: 35 $
```

### Après (avec images variantes)
```
PAGE PRODUIT: "T-shirt Premium"

┌──────────────────────┐
│  IMAGE VARIANTE      │  ← Mise à jour dynamique!
│  (Sélection courante)│
│ /uploads/.../s_r.jpg │
└──────────────────────┘
[img1] [img2] [img3]  ← Autres images produit

Sélectionner:
├─ Taille: [S] [M] [L] [XL]
└─ Couleur: [Rouge] [Bleu] [Noir]

Exemple actions:
├─ Cliquer S → Image: T-shirt taille S (détail coutures)
├─ Cliquer M → Image: T-shirt taille M (plus ample)
├─ Cliquer Bleu → Image: T-shirt bleu (couleur réelle)
└─ Cliquer Noir → Image: T-shirt noir (différente teinte)

Prix:
├─ S + Rouge: 35 $ (image spécifique S-Rouge)
├─ M + Bleu: 37 $  (image spécifique M-Bleu, plus cher)
└─ L + Noir: 39 $  (image spécifique L-Noir, premium)
```

---

## Exemple 2: Smartphone avec Couleurs

### Flow Utilisateur

```
STEP 1: Visiter produit
┌────────────────────────────────┐
│ TÉLÉPHONE SAMSUNG A15          │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │  IMAGE DEFAUT            │  │
│  │ /uploads/.../noir.jpg    │  │
│  │ (Couleur sélectionnée)   │  │
│  └──────────────────────────┘  │
│  [miniature 1] [2] [3] [4]     │
│                                │
│ COULEUR: [Noir] [Bleu] [Blanc] │
│                                │
│ Noir est défaut                │
└────────────────────────────────┘

STEP 2: Cliquer "Bleu"
┌────────────────────────────────┐
│ TÉLÉPHONE SAMSUNG A15          │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │  IMAGE VARIANTE BLEU     │  │ ← CHANGE!
│  │ /uploads/.../bleu.jpg    │  │
│  │ (Nouvelle image)         │  │
│  └──────────────────────────┘  │
│  [miniature 1] [2] [3] [4]     │
│                                │
│ COULEUR: [Noir] [Bleu] [Blanc] │
│          ✓ Bleu sélectionné    │
│                                │
│ Prix: 199 $ (même prix)        │
└────────────────────────────────┘

STEP 3: Cliquer "Blanc"
┌────────────────────────────────┐
│ TÉLÉPHONE SAMSUNG A15          │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │  IMAGE VARIANTE BLANC    │  │ ← CHANGE ENCORE!
│  │ /uploads/.../blanc.jpg   │  │
│  │ (Image blanc)            │  │
│  └──────────────────────────┘  │
│  [miniature 1] [2] [3] [4]     │
│                                │
│ COULEUR: [Noir] [Bleu] [Blanc] │
│                    ✓ Blanc     │
│                                │
│ Prix: 199 $ (même prix)        │
└────────────────────────────────┘

STEP 4: Ajouter au panier
┌────────────────────────────────┐
│ PANIER → Blanc                 │
├────────────────────────────────┤
│ Samsung A15 (Blanc)            │
│ Image: /uploads/.../blanc.jpg  │
│ Prix: 199 $ (+ frais/transport)│
│ Quantité: 1                    │
└────────────────────────────────┘
```

---

## Exemple 3: Admin Upload Flow

```
ADMIN PANEL - ÉDITER PRODUIT

┌──────────────────────────────────────────┐
│ CHAUSSURE DE SPORT - VARIANTES           │
├──────────────────────────────────────────┤
│                                          │
│ GROUPE "TAILLE":                         │
│ ├─ Variante 35                           │
│ │  ├─ SKU: SHOE-35                       │
│ │  ├─ Prix: 45 ¥ → 28000 FCFA            │
│ │  ├─ Stock: 50                          │
│ │  └─ Image: [_______] [Uploader] [X]    │
│ │            URL field   Button   preview│
│ │                                        │
│ │  CLIQUER "UPLOADER" ↓                  │
│ │                                        │
│ │  Sélectionner file: shoe_size_35.jpg   │
│ │                                        │
│ │  UPLOAD ↓ (via /api/upload)            │
│ │                                        │
│ │  ✅ Alerte: "Image uploadée!"          │
│ │  ├─ Image: /api/uploads/variants/...   │
│ │  └─ Preview: [miniature 8×8px]         │
│ │                                        │
│ ├─ Variante 36                           │
│ │  ├─ SKU: SHOE-36                       │
│ │  ├─ Prix: 45 ¥ → 28000 FCFA            │
│ │  ├─ Stock: 60                          │
│ │  └─ Image: [_______] [Uploader] [preview]
│ │                                        │
│ │  (Répéter pour chaque variante)        │
│ │                                        │
│ └─ Variante 37                           │
│    ├─ SKU: SHOE-37                       │
│    ├─ Prix: 47 ¥ → 29120 FCFA            │
│    ├─ Stock: 40                          │
│    └─ Image: [_______] [Uploader] [ ]    │
│               (Sans image pour celle-ci) │
│                                          │
│ ────────────────────────────────────────│
│ [SAUVEGARDER PRODUIT]                    │
└──────────────────────────────────────────┘

RÉSULTAT EN BASE DE DONNÉES:

Product {
  name: "Chaussure de Sport",
  variantGroups: [
    {
      name: "Taille",
      variants: [
        {
          id: "35",
          name: "Taille 35",
          sku: "SHOE-35",
          price1688: 45,
          priceFCFA: 28000,
          stock: 50,
          image: "/api/uploads/variants/1705-abc123-d.jpg"  ✓
        },
        {
          id: "36",
          name: "Taille 36",
          sku: "SHOE-36",
          price1688: 45,
          priceFCFA: 28000,
          stock: 60,
          image: "/api/uploads/variants/1705-def456-g.jpg"  ✓
        },
        {
          id: "37",
          name: "Taille 37",
          sku: "SHOE-37",
          price1688: 47,
          priceFCFA: 29120,
          stock: 40,
          image: null  (pas d'image)
        }
      ]
    }
  ]
}
```

---

## Exemple 4: Client Navigation (Final)

```
CLIENT VOIT PRODUIT

PAGE INITIALE:
┌────────────────────────────────────┐
│ CHAUSSURE DE SPORT - 28000 FCFA    │
├────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ IMAGE TAILLE 35 (défaut)    │   │
│  │ Détail semelle taille S     │   │
│  │ /api/uploads/vars/1705-abc  │   │
│  └─────────────────────────────┘   │
│  [miniature] [1688] [chat]         │
│                                    │
│  TAILLE: [35] [36] [37]            │
│           ← défaut, a une image    │
│                                    │
│  Prix: 28000 FCFA                  │
│  Stock: 50 unités                  │
└────────────────────────────────────┘

CLIENT CLIQUE TAILLE 36:
┌────────────────────────────────────┐
│ CHAUSSURE DE SPORT - 28000 FCFA    │
├────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ IMAGE TAILLE 36 (nouvelle)  │   │ ← CHANGE!
│  │ Détail semelle taille M     │   │   Transition smooth
│  │ /api/uploads/vars/1705-def  │   │   (pas de flicker)
│  └─────────────────────────────┘   │
│  [miniature] [1688] [chat]         │
│                                    │
│  TAILLE: [35] [36] [37]            │
│              ← sélectionnée       │
│                                    │
│  Prix: 28000 FCFA (même)           │
│  Stock: 60 unités (update)         │
└────────────────────────────────────┘

CLIENT CLIQUE TAILLE 37 (pas d'image):
┌────────────────────────────────────┐
│ CHAUSSURE DE SPORT - 29120 FCFA    │
├────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ IMAGE PRODUIT GÉNÉRALE      │   │ ← FALLBACK
│  │ (pas d'image variante 37)   │   │   Pas d'erreur!
│  │ (bonne pratique UX)         │   │
│  └─────────────────────────────┘   │
│  [miniature] [1688] [chat]         │
│                                    │
│  TAILLE: [35] [36] [37]            │
│                   ← sélectionnée   │
│                                    │
│  Prix: 29120 FCFA (plus cher!)     │
│  Stock: 40 unités                  │
└────────────────────────────────────┘

CLIENT AJOUTE AU PANIER:
┌────────────────────────────────┐
│ PANIER MISE À JOUR             │
├────────────────────────────────┤
│ Chaussure de Sport (Taille 37) │
│ Image: [image-produit-general] │
│ Prix: 29120 FCFA               │
│ Quantité: 1                    │
│ Sous-total: 29120 FCFA         │
│                                │
│ [CONTINUER ACHAT]              │
└────────────────────────────────┘
```

---

## Exemple 5: Upload Erreurs & Feedback

```
ADMIN UPLOAD - CAS D'ERREUR

TENTATIVE 1: Fichier trop gros (10 MB)
┌──────────────────────────┐
│ Sélectionner: huge.jpg   │
│ (10 MB)                  │
│                          │
│ Cliquer "Uploader"       │
│ ↓ POST /api/upload       │
│                          │
│ ❌ Réponse:              │
│ "Fichier trop volumineux │
│  (5MB max)"              │
│                          │
│ Action: Redimensionner  │
│ avec ImageMagick, etc.  │
└──────────────────────────┘

TENTATIVE 2: Format incorrect (.bmp)
┌──────────────────────────┐
│ Sélectionner: shoe.bmp   │
│                          │
│ Cliquer "Uploader"       │
│ ↓ POST /api/upload       │
│                          │
│ ❌ Réponse:              │
│ "Type de fichier non     │
│  autorisé: image/bmp"    │
│ (Seuls: JPG PNG WebP GIF)│
│                          │
│ Action: Convertir en PNG │
└──────────────────────────┘

TENTATIVE 3: Succès ✅
┌──────────────────────────┐
│ Sélectionner: shoe.jpg   │
│ (300 KB)                 │
│                          │
│ Cliquer "Uploader"       │
│ ↓ POST /api/upload       │
│                          │
│ ✅ Réponse:              │
│ "Image uploadée avec     │
│  succès!"                │
│                          │
│ Preview affiché:         │
│ [miniature 8×8px]        │
│                          │
│ Champ URL rempli:        │
│ /api/uploads/vars/1705.. │
│                          │
│ Action: Sauvegarder      │
│ produit                  │
└──────────────────────────┘

TENTATIVE 4: Rate limit dépassé
┌──────────────────────────┐
│ 10 uploads en 1 heure    │
│ 11ème upload             │
│                          │
│ ❌ Réponse:              │
│ "Rate limit dépassé      │
│  (10 uploads/heure max)" │
│                          │
│ Attendre 1h pour reset   │
│ ou contacter admin       │
└──────────────────────────┘
```

---

## Exemple 6: Workflow Complet Réel

```
JOUR 1: ADMIN CRÉE PRODUIT (SANS IMAGES VARIANTES)

1. Importer produit d'Alibaba: "Sac à Dos Professionnel"
2. Créer 3 couleurs: Noir, Gris, Bleu
3. Créer 2 tailles: S, M
4. Sauvegarder (sans images variantes pour le moment)

RÉSULTAT CLIENT: Voir produit avec image générale, mais au clic
variante, toujours la même image (comportement normal, pas d'erreur)


JOUR 2: ADMIN AMÉLIORE AVEC IMAGES

1. Aller à /admin/produits
2. Éditer "Sac à Dos Professionnel"
3. Pour chaque variante pertinente, uploader image:
   - Noir/S: sac_noir_small.jpg → /api/uploads/variants/1705-xxx-1.jpg
   - Noir/M: sac_noir_medium.jpg → /api/uploads/variants/1705-xxx-2.jpg
   - Gris/S: sac_gris_small.jpg → /api/uploads/variants/1705-xxx-3.jpg
   - Gris/M: sac_gris_medium.jpg → /api/uploads/variants/1705-xxx-4.jpg
   - Bleu/S: sac_bleu_small.jpg → /api/uploads/variants/1705-xxx-5.jpg
   - Bleu/M: sac_bleu_medium.jpg → /api/uploads/variants/1705-xxx-6.jpg
4. Sauvegarder produit

RÉSULTAT BD:
Product.variantGroups[0] (Couleur):
├─ Noir: image = /api/uploads/variants/1705-xxx-1.jpg
├─ Gris: image = /api/uploads/variants/1705-xxx-3.jpg
└─ Bleu: image = /api/uploads/variants/1705-xxx-5.jpg

Product.variantGroups[1] (Taille):
├─ S: image = ... (première trouvée pour S, ex: Noir/S)
└─ M: image = ... (première trouvée pour M, ex: Noir/M)


JOUR 3: CLIENTS VOIENT AMÉLIORATION

Utilisateur 1:
├─ Visite produit
├─ Galerie affiche sac noir/small par défaut
├─ Clique Gris → Affiche sac gris/small
├─ Clique M → Affiche sac gris/medium
└─ Ajoute au panier

Utilisateur 2:
├─ Visite produit
├─ Clique Bleu → Affiche sac bleu immédiatement
├─ Clique M → Affiche sac bleu/medium
├─ Prix/stock mises à jour automatiquement
└─ Expérience améliorée vs avant!


RÉSULTAT FINAL:
✓ Produit améliore sans refonte
✓ Images variantes visibles et pertinentes
✓ Clients mieux informés
✓ Taux conversion potentiellement augmenté
✓ Admin peut continuer améliorer progressivement
```

---

**Visualisations créées**: Janvier 2025  
**Format**: ASCII art + flux diagrams  
**Objectif**: Aide à la compréhension feature pour tous les utilisateurs

