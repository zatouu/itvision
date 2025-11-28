# Workflow Technicien : Interventions et Devis

## Vue d'ensemble

Le système permet aux techniciens de créer des fiches d'intervention détaillées, qui génèrent automatiquement des devis lorsque des produits sont recommandés.

## Flux de travail complet

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TECHNICIEN : Création de la fiche d'intervention         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ • Sélectionne ou crée le client                             │
│ • Remplit les détails (date, heures, type)                  │
│ • Ajoute photos avant/après                                 │
│ • Décrit les travaux effectués                              │
│ • Capture localisation GPS                                  │
│ • Ajoute recommandations de produits (optionnel)            │
│ • Signatures technicien + client                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SYSTÈME : Traitement de la soumission                    │
│    API: POST /api/interventions/submit                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─── Status = 'brouillon' → Sauvegarde uniquement
                  │
                  └─── Status = 'soumis' → Suite du workflow
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SYSTÈME : Génération automatique de devis (si applicable)│
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─── PAS de recommandations
                  │    → Intervention créée sans devis
                  │    → Notification admin : "En attente de validation"
                  │
                  └─── Recommandations présentes
                       │
                       ▼
        ┌────────────────────────────────────────┐
        │ Recherche produits dans le catalogue   │
        │ • Nom du produit (fuzzy match)         │
        │ • Prix unitaire                        │
        │ • Marge recommandée                    │
        └───────────────┬────────────────────────┘
                        │
                        ├─── Tous les produits trouvés
                        │    ✅ DEVIS GÉNÉRÉ AUTOMATIQUEMENT
                        │    • Calcul subtotal
                        │    • Application marge
                        │    • TVA 18%
                        │    • Lié à l'intervention
                        │    • Status: 'draft'
                        │    → Notification admin : "Devis généré automatiquement"
                        │
                        └─── Produits manquants
                             ⚠️ Pas de devis automatique
                             → Notification admin : "Devis à créer manuellement"
                             
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ADMIN : Révision et validation                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─── Intervention seule
                  │    • Valide l'intervention
                  │    • Crée devis manuellement si nécessaire
                  │
                  └─── Intervention + Devis auto
                       • Révise le devis (prix, quantités, conditions)
                       • Ajuste si nécessaire
                       • Envoie au client pour approbation
                       
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CLIENT : Approbation du devis                            │
│    • Reçoit le devis                                         │
│    • Approuve ou demande modifications                       │
│    • Confirme commande                                       │
└─────────────────────────────────────────────────────────────┘
```

## Modèle de données : Intervention

### Champs principaux

```typescript
{
  // Identification
  interventionNumber: "INT-2025-00123",
  
  // Références
  clientId: ObjectId,
  projectId: ObjectId (optionnel),
  technicienId: ObjectId,
  
  // Planning
  date: Date,
  heureDebut: "09:00",
  heureFin: "11:30",
  duree: 150, // minutes (calculé automatiquement)
  
  // Type et priorité
  typeIntervention: "maintenance" | "urgence" | "installation" | "autre",
  priority: "low" | "medium" | "high" | "critical",
  
  // Contenu
  description: "Description du problème",
  activites: "Tâches effectuées",
  observations: "Observations terrain",
  
  // Recommandations produits
  recommandations: [
    {
      produit: "Caméra Hikvision DS-2CD2143G0",
      quantite: 2,
      commentaire: "Remplacement nécessaire"
    }
  ],
  
  // Documentation
  photosAvant: [
    {
      url: "https://...",
      caption: "État initial",
      timestamp: Date,
      gps: { lat: 14.7167, lng: -17.4677 }
    }
  ],
  photosApres: [...],
  
  // Signatures
  signatures: {
    technician: {
      signature: "data:image/png;base64,...",
      name: "John Doe",
      timestamp: Date
    },
    client: {
      signature: "data:image/png;base64,...",
      name: "Client Name",
      title: "Responsable IT",
      timestamp: Date
    }
  },
  
  // GPS
  gpsLocation: {
    lat: 14.7167,
    lng: -17.4677,
    timestamp: Date
  },
  
  // Workflow
  status: "brouillon" | "soumis" | "valide" | "en_cours" | "termine",
  quoteId: ObjectId (si devis généré),
  quoteGenerated: true/false,
  
  // Historique
  history: [
    {
      action: "created",
      userId: ObjectId,
      timestamp: Date,
      details: { status: "soumis" }
    }
  ]
}
```

## Modèle de données : Devis

```typescript
{
  clientId: ObjectId,
  projectId: ObjectId (optionnel),
  serviceCode: "MAINTENANCE",
  
  status: "draft" | "sent" | "approved" | "rejected",
  
  products: [
    {
      productId: ObjectId,
      name: "Caméra Hikvision",
      quantity: 2,
      unitPrice: 150000,
      marginRate: 30,
      totalPrice: 300000
    }
  ],
  
  subtotal: 300000,
  marginTotal: 90000,
  totalHT: 390000,
  totalTTC: 460200, // +18% TVA
  
  currency: "Fcfa",
  assignedTechnicianId: ObjectId,
  notes: "Devis généré depuis INT-2025-00123\n\nObservations: ..."
}
```

## API Endpoints

### 1. Soumettre une intervention

```http
POST /api/interventions/submit
Content-Type: application/json
Authorization: Bearer <token>

{
  "technicienId": "...",
  "clientId": "...",
  "projectId": "..." (optionnel),
  "date": "2025-01-15",
  "heureDebut": "09:00",
  "heureFin": "11:30",
  "typeIntervention": "maintenance",
  "description": "...",
  "activites": "...",
  "observations": "...",
  "recommandations": [
    {
      "produit": "Caméra Hikvision",
      "quantite": 2,
      "commentaire": "..."
    }
  ],
  "photosAvant": [...],
  "photosApres": [...],
  "signatures": {...},
  "gpsLocation": {...},
  "status": "soumis", // ou "brouillon"
  "priority": "medium"
}
```

**Réponse succès (avec devis automatique) :**

```json
{
  "success": true,
  "intervention": {
    "id": "67...",
    "interventionNumber": "INT-2025-00123"
  },
  "quote": {
    "id": "67...",
    "totalTTC": 460200,
    "productsCount": 2,
    "status": "draft"
  }
}
```

**Réponse succès (sans devis) :**

```json
{
  "success": true,
  "intervention": {
    "id": "67...",
    "interventionNumber": "INT-2025-00123"
  },
  "quote": null
}
```

## Notifications Admin

### Intervention + Devis générés

```
Type: success
Titre: Intervention + Devis créés
Message: "John Doe a soumis une intervention avec 3 recommandation(s) 
         — devis automatique généré (460 200 Fcfa)"
Action: /admin/quotes?id=67...
```

### Intervention sans devis (pas de recommandations)

```
Type: info
Titre: Nouvelle intervention soumise
Message: "John Doe a soumis une intervention — en attente de validation"
Action: /admin/interventions?id=67...
```

### Intervention avec recommandations (produits non trouvés)

```
Type: info
Titre: Nouvelle intervention soumise
Message: "John Doe a soumis une intervention avec 2 recommandation(s) 
         — devis à générer par l'admin"
Action: /admin/interventions?id=67...
```

## Messages utilisateur (Technicien)

### Soumission avec devis généré

```
Intervention soumise avec succès !

✅ Devis automatique généré : 460 200 Fcfa (3 produit(s))

L'admin pourra réviser et envoyer le devis au client.
```

### Soumission avec recommandations (produits manquants)

```
Intervention soumise avec succès !

⚠️ Certains produits recommandés ne sont pas dans le catalogue.
L'admin devra créer le devis manuellement.
```

### Soumission sans recommandations

```
Intervention soumise avec succès !
```

## Logique de génération de devis

### Conditions pour génération automatique

1. ✅ Status = `'soumis'` (pas pour les brouillons)
2. ✅ Au moins une recommandation de produit
3. ✅ Les produits doivent être trouvés dans le catalogue (fuzzy match)

### Recherche de produits

```javascript
const product = await Product.findOne({ 
  name: new RegExp(rec.produit, 'i') // Case-insensitive regex
}).lean()
```

### Calcul du devis

```javascript
// Pour chaque produit
unitPrice = product.price || product.priceAmount || 0
totalPrice = unitPrice * quantity
marginRate = product.marginRate || 30 // % par défaut

// Totaux
subtotal = Σ totalPrice
marginTotal = Σ (totalPrice × marginRate / 100)
totalHT = subtotal + marginTotal
totalTTC = totalHT × 1.18 // TVA 18%
```

## Cas d'usage typiques

### 1. Maintenance préventive simple (sans produits)

```
Technicien → Crée fiche → Pas de recommandations → Soumet
           ↓
Admin ← Notification "En attente validation"
      ↓
Valide l'intervention → Fin
```

### 2. Intervention avec remplacement de matériel

```
Technicien → Crée fiche → Recommande 2 caméras → Soumet
           ↓
Système → Trouve produits → Génère devis auto (460k Fcfa)
        ↓
Admin ← Notification "Devis généré"
      ↓
Révise devis → Ajuste prix si besoin → Envoie au client
             ↓
Client ← Reçoit devis → Approuve → Commande
```

### 3. Intervention urgente (produits non catalogués)

```
Technicien → Crée fiche → Recommande pièces spéciales → Soumet
           ↓
Système → Produits non trouvés → Pas de devis auto
        ↓
Admin ← Notification "Devis à créer manuellement"
      ↓
Crée devis manuel → Ajoute fournisseurs → Envoie au client
```

## Améliorations futures

### Court terme
- [ ] Prévisualisation du devis avant soumission
- [ ] Recherche de produits améliorée (synonymes, codes)
- [ ] Templates de recommandations fréquentes

### Moyen terme
- [ ] Historique des prix produits
- [ ] Suggestions de produits basées sur le type d'intervention
- [ ] Validation automatique pour petits montants

### Long terme
- [ ] Machine learning pour prédire les besoins
- [ ] Intégration fournisseurs (disponibilité temps réel)
- [ ] Workflow d'approbation hiérarchique

## Dépannage

### Le devis n'est pas généré automatiquement

**Causes possibles :**
1. Status = 'brouillon' (au lieu de 'soumis')
2. Aucune recommandation ajoutée
3. Noms de produits incorrects (non trouvés dans le catalogue)
4. Erreur base de données

**Solution :**
- Vérifier les logs serveur pour `Erreur génération devis automatique`
- Admin peut créer le devis manuellement depuis l'interface

### Les produits recommandés ne sont pas trouvés

**Causes possibles :**
1. Nom exact différent du catalogue
2. Produit pas encore ajouté au catalogue
3. Faute d'orthographe

**Solution :**
- Utiliser des noms exacts ou très proches
- Ajouter les produits manquants au catalogue
- Admin crée le devis manuellement

## Support

Pour toute question ou problème :
- **Admin** : Accès complet aux interventions et devis
- **Technicien** : Support via le portail technicien
- **Documentation** : Ce fichier + commentaires dans le code









