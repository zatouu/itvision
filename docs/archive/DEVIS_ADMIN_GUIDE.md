# Guide d'Utilisation - Générateur de Devis Admin avec BRS

## Vue d'ensemble

Ce système permet de créer et gérer des devis professionnels au format IT Vision, avec calcul automatique du **BRS (Bordereau de Réduction Sénégalaise)** à 5%, conforme à la fiscalité sénégalaise.

## Caractéristiques principales

### 1. Format de devis professionnel
- ✅ En-tête avec logo IT Vision
- ✅ Informations société (adresse, RCN, NINEA, téléphones)
- ✅ Numéro de devis et date
- ✅ Informations client complètes
- ✅ Tableau produits détaillé
- ✅ Calcul avec BRS (5% de déduction)
- ✅ Zone cachet et signature
- ✅ Footer professionnel

### 2. Gestion des produits
- Import depuis le catalogue produits
- Ajout d'articles personnalisés
- Modification quantité et prix unitaire
- Marquage imposable/non imposable
- Calcul automatique des totaux

### 3. Calculs fiscaux

```
Sous-total:                1,605,737.00 CFA
BRS (5.00%):                -80,286.85 CFA  ← Déduction automatique
Taxe de vente:                       0 CFA
Autres:                              0 CFA
─────────────────────────────────────────
TOTAL:                     1,525,450.15 CFA
```

**Formule BRS:**
```javascript
const brsAmount = subtotal * 0.05
const total = subtotal - brsAmount + taxAmount + other
```

## Accès

**URL:** `/admin/devis`

**Navigation:** Admin → Devis & Tarification

## Utilisation

### 1. Créer un nouveau devis

1. Cliquer sur **"Nouveau Devis"**
2. Remplir les informations:

#### Informations générales
- **Numéro de devis:** Format `2024-046` (généré automatiquement, modifiable)
- **Date:** Date du jour par défaut
- **Statut:** Brouillon / Envoyé / Accepté / Rejeté

#### Informations client
- **Nom du client*** (obligatoire): `Coralia`
- **Téléphone:** `+221 77 413 34 40`
- **Adresse:** `11 Cité Lessine, Nord Foire`
- **Email:** `contact@coralia.sn`
- **RC N° / SN DDER:** `SN DDER 2019 A 10739`
- **NINEA:** `007305734`

### 2. Ajouter des produits

#### Option A: Depuis le catalogue
1. Cliquer sur **"Catalogue"**
2. Rechercher le produit
3. Cliquer sur **"Ajouter"**
4. Le produit s'ajoute avec son prix du catalogue

#### Option B: Article personnalisé
1. Cliquer sur **"Article personnalisé"**
2. Saisir:
   - **Description:** `Camera PTZ HIKVISION DS-2SE3C404MWG-E 14 Tandem(Via APP + AMP 44 POE (Optionnelle))`
   - **Quantité:** `1`
   - **Prix unitaire:** `215,000 CFA`
   - **Imposable?:** ☑ (coché par défaut)
3. Le montant se calcule automatiquement

### 3. Gérer les produits

| Action | Description |
|--------|-------------|
| Modifier quantité | Changer le nombre dans la colonne "Quantité" |
| Modifier prix | Ajuster le prix unitaire |
| Changer imposabilité | Cocher/décocher "Imposable?" |
| Supprimer | Cliquer sur l'icône ❌ |

### 4. Vérifier les totaux

Le panneau des totaux se met à jour automatiquement :

```
┌─────────────────────────────────────┐
│ Sous-total      1,605,737.00 CFA    │
│ BRS (5.00%)      -80,286.85 CFA     │ ← En orange
│ Taxe de vente            0 CFA      │
│ Autres                   0 CFA      │
├─────────────────────────────────────┤
│ TOTAL           1,525,450.15 CFA    │ ← En bleu, gros
└─────────────────────────────────────┘
```

### 5. Ajouter des notes

Dans le champ "Notes additionnelles":
```
Conditions de paiement: 80%
```

### 6. Sauvegarder

- **Sauvegarder:** Enregistre le devis (base de données + localStorage)
- **Exporter PDF:** Génère le PDF téléchargeable

### 7. Consulter la liste des devis

L'onglet **"Liste des Devis"** affiche:

```
┌─────────────────────────────────────────────┐
│ Devis #2024-046            [Brouillon]      │
│ 🏢 Coralia                                   │
│ 📅 17/03/2025                                │
│ 📦 10 articles                               │
│ 💰 1,525,450 CFA                             │
│                                              │
│ [✏️ Éditer] [⬇️ PDF] [🗑️ Supprimer]          │
└─────────────────────────────────────────────┘
```

## Format PDF généré

### Structure

```
┌────────────────────────────────────────────┐
│ 🎨 EN-TÊTE BLEU MARINE                     │
│ IT Vision              DEVIS               │
│                        Maintenance CORALIA  │
├────────────────────────────────────────────┤
│ Adresse de la société          Date: ...   │
│ 11 Cité Lessine, ...           N°: 2024-046│
│ RC N°: ...                                 │
│ NINEA: ...                                 │
├────────────────────────────────────────────┤
│ Devis pour                                 │
│ Coralia                                    │
│ 11 Cité Lessine, Nord Foire               │
│ Tel: +221 77 413 34 40                     │
├────────────────────────────────────────────┤
│ TABLEAU PRODUITS                           │
│ ┌────┬────────────┬──────┬─────┬────────┐ │
│ │Qté │Description │Prix  │Imp? │Montant │ │
│ ├────┼────────────┼──────┼─────┼────────┤ │
│ │ 1  │Camera PTZ..│235k  │Non  │235k    │ │
│ └────┴────────────┴──────┴─────┴────────┘ │
├────────────────────────────────────────────┤
│ TOTAUX                                     │
│                    Sous-total  1,605,737 CFA│
│                    BRS (5%)      -80,287 CFA│ ← Orange
│                    Taxe vente          0 CFA│
│                    Autres              0 CFA│
│                    ───────────────────────  │
│                    TOTAL      1,525,450 CFA │ ← Gras
├────────────────────────────────────────────┤
│ Nous vous remercions de votre confiance.   │
│ Conditions de paiement: 80%                │
│                                            │
│         ┌────────────────────┐             │
│         │ CACHET ET SIGNATURE│             │
│         └────────────────────┘             │
├────────────────────────────────────────────┤
│ IT Vision Plus - Sécurité & Digitalisation│
│ www.itvisionplus.sn • +221 77 413 34 40   │
└────────────────────────────────────────────┘
```

## API Endpoints

### GET `/api/admin/quotes`
Récupère tous les devis

**Réponse:**
```json
{
  "quotes": [
    {
      "_id": "...",
      "numero": "2024-046",
      "date": "2025-03-17",
      "client": {
        "name": "Coralia",
        "address": "...",
        "phone": "...",
        "email": "..."
      },
      "products": [...],
      "subtotal": 1605737,
      "brsAmount": 80286.85,
      "total": 1525450.15,
      "status": "draft"
    }
  ]
}
```

### POST `/api/admin/quotes`
Crée ou met à jour un devis

**Body:**
```json
{
  "numero": "2024-046",
  "date": "2025-03-17",
  "client": {
    "name": "Coralia",
    "address": "11 Cité Lessine, Nord Foire",
    "phone": "+221 77 413 34 40",
    "email": "contact@coralia.sn",
    "rcn": "SN DDER 2019 A 10739",
    "ninea": "007305734"
  },
  "products": [
    {
      "description": "Camera PTZ...",
      "quantity": 1,
      "unitPrice": 235000,
      "taxable": true,
      "total": 235000
    }
  ],
  "subtotal": 1605737,
  "brsAmount": 80286.85,
  "taxAmount": 0,
  "other": 0,
  "total": 1525450.15,
  "status": "draft",
  "notes": "Conditions de paiement: 80%"
}
```

### POST `/api/admin/quotes/pdf`
Génère le PDF d'un devis

**Body:** Même que POST `/api/admin/quotes`

**Réponse:** Fichier PDF

## Modèle de données

### AdminQuote (MongoDB)

```typescript
interface IAdminQuote {
  numero: string              // Unique, indexé
  date: Date
  client: {
    name: string             // Obligatoire
    address: string
    phone: string
    email: string
    rcn?: string             // RC N° / SN DDER
    ninea?: string           // NINEA
  }
  products: Array<{
    description: string
    quantity: number         // Min: 1
    unitPrice: number        // Min: 0
    taxable: boolean         // Par défaut: true
    total: number            // quantity * unitPrice
  }>
  subtotal: number           // Somme des products.total
  brsAmount: number          // subtotal * 0.05
  taxAmount: number          // Taxes additionnelles (par défaut 0)
  other: number              // Frais divers (par défaut 0)
  total: number              // subtotal - brsAmount + taxAmount + other
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  notes?: string
  bonCommande?: string
  dateLivraison?: string
  pointExpedition?: string
  conditions?: string
  createdBy?: string         // Email de l'utilisateur
  createdAt: Date
  updatedAt: Date
}
```

## Stockage

- **Base de données:** MongoDB (`adminquotes` collection)
- **Fallback:** localStorage (`itvision-admin-quotes`)
- **Persistance:** Double sauvegarde pour fiabilité

## Statuts de devis

| Statut | Badge | Description |
|--------|-------|-------------|
| `draft` | Gris | Brouillon en cours d'édition |
| `sent` | Bleu | Envoyé au client |
| `accepted` | Vert | Accepté par le client |
| `rejected` | Rouge | Rejeté par le client |

## Avantages du système

### 1. Conformité fiscale sénégalaise
✅ BRS (5%) calculé automatiquement  
✅ Format conforme aux devis locaux  
✅ Mentions légales obligatoires (RC, NINEA)

### 2. Productivité
✅ Import depuis catalogue  
✅ Calculs automatiques  
✅ Templates pré-remplis  
✅ Génération PDF en 1 clic

### 3. Traçabilité
✅ Historique complet  
✅ Numérotation unique  
✅ Statuts clairs  
✅ Audit trail (createdBy, dates)

### 4. Flexibilité
✅ Articles personnalisés  
✅ Prix modifiables  
✅ Notes libres  
✅ Conditions de paiement

## Exemples d'utilisation

### Cas 1: Devis maintenance standard

```
Client: Coralia
Produits:
  - 8× Camera Mini Bullet coloVu SMART @ 37,000 = 296,000 CFA
  - 1× Camera PTZ @ 215,000 = 215,000 CFA
  - 8× Boite de jonction @ 6,500 = 52,000 CFA
  - 2× Disque dur 4 To @ 60,000 = 120,000 CFA
  ...

Sous-total:     1,605,737 CFA
BRS (5%):         -80,287 CFA
─────────────────────────────
TOTAL:          1,525,450 CFA
```

### Cas 2: Devis installation simple

```
Client: Sea Plaza
Produits:
  - 1× Installation système alarme @ 150,000 CFA
  - 4× Détecteur de mouvement @ 12,000 = 48,000 CFA
  - 1× Centrale alarme @ 85,000 CFA

Sous-total:       283,000 CFA
BRS (5%):         -14,150 CFA
─────────────────────────────
TOTAL:            268,850 CFA
```

## Différences avec l'ancien système

| Aspect | Ancien | Nouveau |
|--------|--------|---------|
| TVA | 18% (France) | BRS 5% (Sénégal) ✅ |
| Format PDF | Générique | IT Vision branded ✅ |
| Import produits | Non | Depuis catalogue ✅ |
| Statuts | 4 | 4 identiques |
| Sauvegarde | MongoDB | MongoDB + localStorage ✅ |
| UI | Complexe | Simplifiée ✅ |
| Responsive | Partiel | Complet ✅ |

## Migration depuis l'ancien système

Les anciens devis (avec TVA) restent accessibles via `/admin/quotes`.  
Les nouveaux devis (avec BRS) sont sur `/admin/devis`.

Pas de migration automatique nécessaire - coexistence possible.

## Troubleshooting

### Le PDF ne se génère pas
- Vérifier que tous les champs obligatoires sont remplis
- Vérifier qu'au moins un produit est ajouté
- Regarder la console pour les erreurs

### Les totaux sont incorrects
- Le calcul se fait automatiquement
- BRS = 5% du sous-total
- Vérifier le champ "Autres" (peut ajouter des frais)

### Les produits ne s'affichent pas
- Vérifier l'API `/api/catalog/products`
- Vérifier que des produits existent dans la base

### La sauvegarde échoue
- Fallback automatique sur localStorage
- Vérifier la connexion MongoDB
- Regarder les logs serveur

## Support

Pour toute question ou problème:
- 📧 Email: contact@itvisionplus.sn
- 📞 Téléphone: +221 77 413 34 40
- 🌐 Web: www.itvisionplus.sn

---

**Version:** 1.0.0  
**Date:** Mars 2025  
**Auteur:** IT Vision Plus





