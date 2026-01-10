# Proposition: Réorganisation Page Produit - Mise en avant Achat Groupé

## Problème actuel
L'achat groupé est noyé dans la page :
1. Prix individuel d'abord (gros bloc)
2. Actions d'achat standard (boutons verts)
3. Paliers de prix (si pas de groupe)
4. **Achat groupé** (trop bas, peu visible)
5. Proposition de groupe (encore plus bas)

## Solution proposée

### Nouvelle hiérarchie visuelle

```
┌─────────────────────────────────────────────┐
│  GALERIE (5 col)  │  INFO PRODUIT (4 col)   │
│                   │                          │
│                   │  1. Titre + Description  │
│                   │                          │
│                   │  ┌────────────────────┐ │
│                   │  │ 🎯 ACHAT GROUPÉ    │ │ <- NOUVEAU : EN PREMIER
│                   │  │ Rejoindre/Proposer │ │
│                   │  │ Économisez jusqu'à │ │
│                   │  │ XX% !              │ │
│                   │  └────────────────────┘ │
│                   │                          │
│                   │  OU (si pas de groupe)   │
│                   │                          │
│                   │  ┌────────────────────┐ │
│                   │  │ 💳 PRIX INDIVIDUEL │ │ <- Deuxième position
│                   │  │ Structure détaillée│ │
│                   │  └────────────────────┘ │
│                   │                          │
│                   │  Actions: Acheter/Devis │
│                   │                          │
│                   │  📊 Paliers de prix     │
│                   │                          │
│                   │  🔧 Installation         │
└─────────────────────────────────────────────┘
```

### Changements visuels

1. **Badge animé pulsant** sur le bloc achat groupé
2. **Taille augmentée** : de `p-4` à `p-6`
3. **Couleurs plus vives** : gradient violet/bleu plus saturé
4. **Position stratégique** : juste après le titre, avant le prix
5. **CTA plus gros** : boutons plus larges et visibles
6. **Timer countdown** : affiché en premier dans le bloc
7. **Urgence visuelle** : badges "Places restantes", "Expire dans X"

### Code à réorganiser

Déplacer le bloc achat groupé (lignes 1448-1580) **AVANT** le bloc prix individuel (lignes 900-1100).

### Avantages

✅ Premier élément visible après le titre  
✅ Met en avant l'économie collective  
✅ Crée un sentiment d'urgence (timer, places)  
✅ Prix individuel reste disponible en fallback  
✅ Expérience guidée : groupe → individuel

---

**Dois-je implémenter cette réorganisation ?**
