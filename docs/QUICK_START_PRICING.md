# Guide Rapide - Gestion des Prix avec Marge 0%

## 🚀 Démarrage Rapide

### Qu'est-ce qui a changé ?

**AVANT** : Les produits avaient une marge automatique de 25%  
**MAINTENANT** : Les produits ont une marge de 0% par défaut (ajustable manuellement)

---

## 📦 Migration des Produits Existants

### Étape 1 : Simulation (Obligatoire)

```bash
npm run migrate:margin:dry
```

**Résultat attendu** :
```
🔍 DRY RUN - Aucune modification appliquée
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Total produits: 156
   - Produits avec marge = 25%: 134
   - Produits sans marge: 12
   - Produits avec marge custom: 10

💡 Pour appliquer: npm run migrate:margin
```

### Étape 2 : Migration Réelle

```bash
npm run migrate:margin
```

**Résultat attendu** :
```
✅ Migration terminée avec succès!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Produits modifiés: 146
   - 134 produits (marge 25% → 0%)
   - 12 produits (sans marge → 0%)
   - 10 produits avec marge custom → INCHANGÉS
```

---

## ✅ Tests à Effectuer

### Test 1 : Nouveau Produit

1. Créer un nouveau produit
2. Ne pas renseigner `marginRate`
3. ✅ Vérifier : `marginRate` = 0%
4. ✅ Vérifier : Prix = Coût fournisseur (sans marge)

### Test 2 : Ajustement Manuel

1. Éditer un produit
2. Définir `marginRate` = 15
3. ✅ Vérifier : Prix = Coût × 1.15

### Test 3 : Import AliExpress

1. Importer des produits depuis AliExpress
2. ✅ Vérifier : `marginRate` = 0% par défaut
3. ✅ Vérifier : Prix calculé sans marge

---

## 📊 Exemples de Calcul

### Exemple 1 : Produit sans Marge (Défaut)

```
Coût fournisseur : 10,000 FCFA
Marge : 0%
─────────────────────────────
Prix vente : 10,000 FCFA
```

### Exemple 2 : Produit avec Marge 15%

```
Coût fournisseur : 10,000 FCFA
Marge : 15%
─────────────────────────────
Prix vente : 11,500 FCFA
```

### Exemple 3 : Produit Import avec Frais

```
Prix 1688 : 350 ¥
Taux change : 100 FCFA/¥
Coût : 35,000 FCFA

Frais service (10%) : 3,500 FCFA
Assurance (2.5%) : 875 FCFA
Sous-total : 39,375 FCFA

Marge (0%) : 0 FCFA
─────────────────────────────
Prix vente : 39,375 FCFA

Si marge ajustée à 15% :
─────────────────────────────
Prix vente : 45,281 FCFA
```

---

## 🔧 Commandes Utiles

```bash
# Migration
npm run migrate:margin:dry    # Simulation (sûr)
npm run migrate:margin         # Migration réelle

# Aide détaillée
tsx scripts/migrate-margin-rate.ts --help

# Import avec nouvelle marge
npm run import:aliexpress

# Tests
npm run test:pricing
```

---

## 📚 Documentation Complète

| Document | Pour qui ? | Contenu |
|----------|------------|---------|
| **MODIFICATIONS_COMPLETED.md** | Tous | Récapitulatif complet |
| **MARGIN_REFACTOR_PLAN.md** | Développeurs | Plan technique détaillé |
| **PRICING_SYSTEM_SUMMARY.md** | Tous | Vue d'ensemble système |
| **PRICING_ANALYSIS.md** | Développeurs | Analyse approfondie |

---

## ❓ Questions Fréquentes

### Q1 : Est-ce que les prix existants vont changer ?

**R :** Oui, si vous exécutez la migration. Les produits avec marge 25% auront leur marge mise à 0%, ce qui **baissera leur prix de vente**.

**Exemple** :
- Avant : 10,000 FCFA × 1.25 = 12,500 FCFA
- Après : 10,000 FCFA × 1.00 = 10,000 FCFA

### Q2 : Comment ajuster la marge manuellement ?

**R :** Dans l'interface admin, éditer le produit et définir le champ `marginRate` (en pourcentage).

**Exemple** : `marginRate = 15` → marge de 15%

### Q3 : Est-ce que ça affecte les prix dégressifs ?

**R :** Non. Les `priceTiers` (prix dégressifs) sont des **prix fixes** indépendants de la marge.

### Q4 : Est-ce que ça affecte les variantes ?

**R :** Non. Les variantes avec leur propre `price1688` sont calculées normalement avec la marge définie.

### Q5 : Puis-je revenir en arrière ?

**R :** Oui, mais il faut le faire manuellement :
1. Modifier `Product.ts` : `default: 25`
2. Réexécuter la migration avec `--reset-all`

---

## ⚠️ Points d'Attention

### 1. Impact Commercial

- Les prix vont **baisser** si la marge était de 25%
- Vérifier l'impact sur la rentabilité
- Ajuster manuellement les marges si nécessaire

### 2. Comptabilité

- ✅ Plus de transparence (marge visible)
- ✅ Traçabilité améliorée
- ⚠️ Nécessite ajustement des marges produit par produit

### 3. Catalogue

- Tous les nouveaux produits : marge 0% par défaut
- Import AliExpress : marge 0% par défaut
- Ajuster selon stratégie commerciale

---

## 🎯 Checklist Post-Déploiement

- [ ] Exécuter `npm run migrate:margin:dry` (simulation)
- [ ] Vérifier les résultats de la simulation
- [ ] Exécuter `npm run migrate:margin` (migration réelle)
- [ ] Tester création d'un nouveau produit
- [ ] Tester import AliExpress
- [ ] Vérifier calculs de prix dans le catalogue
- [ ] Ajuster manuellement les marges si nécessaire
- [ ] Former l'équipe admin sur le nouveau système
- [ ] Documenter les changements dans CHANGELOG.md

---

## 📞 Support

### En cas de problème

1. **Consulter la doc** : `docs/MODIFICATIONS_COMPLETED.md`
2. **Tester en dry-run** : `npm run migrate:margin:dry`
3. **Vérifier les logs** : Le script affiche des infos détaillées

### Commandes de debug

```bash
# Voir le nombre de produits par marge
# (via MongoDB shell ou interface admin)

# Exemple MongoDB shell:
db.products.aggregate([
  { $group: { _id: "$marginRate", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

---

**Version** : 2.0.0  
**Date** : 2025-01-XX  
**Statut** : ✅ Prêt à l'emploi
