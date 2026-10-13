# Produits du Devis Maintenance CORALIA

Voici les produits à ajouter au catalogue pour correspondre au devis montré :

## Liste des produits

### 1. Camera DS-7610323EG2-16P 16-ch PoE 1U K Series ArcSecurity 4k NVR
- **Prix unitaire :** 235,000 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Vidéosurveillance - NVR
- **En stock :** Oui

### 2. Camera PTZ HIKVISION DS-2SE3C404MWG-E 14 Tandem(Via APP + AMP 44 POE (Optionnelle))
- **Prix unitaire :** 215,000 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Vidéosurveillance - Caméras PTZ
- **En stock :** Oui

### 3. Hikvision DS-PS1-S - Sirène Alarme Extérieure Filaire Anti-intrusion
- **Prix unitaire :** 35,000 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Sécurité - Alarmes
- **En stock :** Oui

### 4. Camera Mini Bullet coloVu SMART HIKVISION DS-2CE10KF0T1-LFS
- **Prix unitaire :** 37,000 CFA
- **Quantité dans devis :** 8
- **Catégorie :** Vidéosurveillance - Caméras Bullet
- **En stock :** Oui

### 5. Boite de jonction Hikvision DS-1280ZJ-S
- **Prix unitaire :** 6,500 CFA
- **Quantité dans devis :** 8
- **Catégorie :** Accessoires - Supports
- **En stock :** Oui

### 6. Rouleau Tube annulé D13
- **Prix unitaire :** 19,000 CFA
- **Quantité dans devis :** 2
- **Catégorie :** Câblage - Gaines
- **En stock :** Oui

### 7. 500 m Cable PTP Cat 6
- **Prix unitaire :** 175,000 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Câblage - Réseau
- **En stock :** Oui

### 8. Onduleur 650 Va
- **Prix unitaire :** 45,000 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Électrique - Onduleurs
- **En stock :** Oui

### 9. Disque dur 4 To
- **Prix unitaire :** 60,000 CFA
- **Quantité dans devis :** 2
- **Catégorie :** Stockage - Disques durs
- **En stock :** Oui

### 10. Main d'oeuvre
- **Prix unitaire :** 394,737 CFA
- **Quantité dans devis :** 1
- **Catégorie :** Services - Installation
- **Imposable :** Oui

## Totaux

```
Sous-total:      1,605,737.00 CFA
BRS (5%):          -80,286.85 CFA
Taxe de vente:              0 CFA
Autres:                     0 CFA
────────────────────────────────
TOTAL:           1,586,000 CFA
```

## Script d'import

Pour ajouter ces produits rapidement, vous pouvez créer un script `scripts/seed-devis-products.js` :

```javascript
const products = [
  {
    name: 'Camera DS-7610323EG2-16P 16-ch PoE 1U K Series ArcSecurity 4k NVR',
    price: 235000,
    category: 'Vidéosurveillance - NVR',
    inStock: true,
    description: 'NVR 16 canaux PoE 4K Hikvision',
    images: []
  },
  {
    name: 'Camera PTZ HIKVISION DS-2SE3C404MWG-E 14 Tandem(Via APP + AMP 44 POE)',
    price: 215000,
    category: 'Vidéosurveillance - PTZ',
    inStock: true,
    description: 'Caméra PTZ Hikvision avec application mobile',
    images: []
  },
  {
    name: 'Hikvision DS-PS1-S - Sirène Alarme Extérieure Filaire Anti-intrusion',
    price: 35000,
    category: 'Sécurité - Alarmes',
    inStock: true,
    description: 'Sirène d\'alarme extérieure filaire',
    images: []
  },
  {
    name: 'Camera Mini Bullet coloVu SMART HIKVISION DS-2CE10KF0T1-LFS',
    price: 37000,
    category: 'Vidéosurveillance - Bullet',
    inStock: true,
    description: 'Caméra bullet ColorVu avec vision nocturne couleur',
    images: []
  },
  {
    name: 'Boite de jonction Hikvision DS-1280ZJ-S',
    price: 6500,
    category: 'Accessoires - Supports',
    inStock: true,
    description: 'Boîte de jonction pour caméras Hikvision',
    images: []
  },
  {
    name: 'Rouleau Tube annulé D13',
    price: 19000,
    category: 'Câblage - Gaines',
    inStock: true,
    description: 'Rouleau de tube annelé diamètre 13mm',
    images: []
  },
  {
    name: '500 m Cable PTP Cat 6',
    price: 175000,
    category: 'Câblage - Réseau',
    inStock: true,
    description: 'Câble réseau Cat 6 PTP bobine 500m',
    images: []
  },
  {
    name: 'Onduleur 650 Va',
    price: 45000,
    category: 'Électrique - Onduleurs',
    inStock: true,
    description: 'Onduleur 650VA pour protection électrique',
    images: []
  },
  {
    name: 'Disque dur 4 To',
    price: 60000,
    category: 'Stockage - Disques',
    inStock: true,
    description: 'Disque dur surveillance 4To',
    images: []
  },
  {
    name: 'Main d\'oeuvre',
    price: 394737,
    category: 'Services - Installation',
    inStock: true,
    description: 'Frais de main d\'oeuvre pour installation',
    images: []
  }
]

// Utilisation:
// 1. Copier ce tableau dans l'admin
// 2. Ou créer via l'API /api/catalog/products en POST
```

## Commande curl pour import automatique

```bash
# Exemple pour ajouter un produit
curl -X POST http://localhost:3000/api/catalog/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camera DS-7610323EG2-16P 16-ch PoE 1U K Series ArcSecurity 4k NVR",
    "price": 235000,
    "category": "Vidéosurveillance - NVR",
    "inStock": true,
    "description": "NVR 16 canaux PoE 4K Hikvision"
  }'
```

## Notes

- Tous les prix sont en **CFA (Franc CFA)**
- BRS de **5%** appliqué sur le sous-total
- Les prix incluent la marge commerciale
- Les produits marqués "En stock" sont disponibles immédiatement
- La "Main d'oeuvre" est un article de service, pas un produit physique





