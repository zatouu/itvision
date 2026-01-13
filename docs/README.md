# 📚 Documentation - Système de Gestion des Prix

Ce dossier contient la documentation complète du système de gestion des prix du projet ITVision.

---

## 🎯 Documents Principaux

### 1. Guide de Démarrage Rapide
**Fichier** : `QUICK_START_PRICING.md`  
**Pour qui** : Administrateurs, débutants  
**Contenu** :
- Instructions de migration rapide
- Tests à effectuer
- Exemples de calcul
- FAQ

👉 **Commencer par ici si vous découvrez le système**

---

### 2. Modifications Complètes
**Fichier** : `MODIFICATIONS_COMPLETED.md`  
**Pour qui** : Tous (développeurs et admins)  
**Contenu** :
- Récapitulatif de tous les changements
- Fichiers créés et modifiés
- Checklist d'implémentation
- Tests à effectuer
- État actuel du système

👉 **Pour voir ce qui a été fait**

---

### 3. Plan de Refactorisation
**Fichier** : `MARGIN_REFACTOR_PLAN.md`  
**Pour qui** : Développeurs  
**Contenu** :
- Plan technique détaillé
- État avant/après
- Changements par fichier
- Migration des données
- Impact sur la comptabilité

👉 **Pour comprendre les détails techniques**

---

### 4. Résumé Complet du Système
**Fichier** : `PRICING_SYSTEM_SUMMARY.md`  
**Pour qui** : Tous  
**Contenu** :
- Vue d'ensemble complète
- Formule de calcul détaillée
- Variables configurables
- Gestion prix dégressifs
- Gestion variantes
- Prochaines étapes

👉 **Pour une vue d'ensemble exhaustive**

---

### 5. Analyse Approfondie
**Fichier** : `PRICING_ANALYSIS.md`  
**Pour qui** : Développeurs, analystes  
**Contenu** :
- Architecture actuelle
- Flux de calcul
- Fonctionnement détaillé
- Problèmes identifiés
- Axes d'amélioration
- Implémentation proposée

👉 **Pour l'analyse technique complète**

---

## 🔄 Changements Récents (v2.0.0)

### ⚡ Marge Commerciale

**AVANT** :
- Marge par défaut : **25%** (appliquée automatiquement)
- Problème : Marge cachée, comptabilité floue

**MAINTENANT** :
- Marge par défaut : **0%** (ajustable manuellement)
- Avantage : Transparence totale, comptabilité claire

### 📁 Fichiers Modifiés

| Fichier | Changement |
|---------|------------|
| `src/lib/models/Product.ts` | `marginRate: default 0` |
| `src/lib/logistics.ts` | Fallback marge à 0 |
| `scripts/import-aliexpress.ts` | `DEFAULT_MARGIN = 0` |
| `src/app/api/products/import/route.ts` | `DEFAULT_MARGIN = 0` |
| `src/app/api/interventions/submit/route.ts` | `marginRate ?? 0` |

### 🆕 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `scripts/migrate-margin-rate.ts` | Script de migration |
| `docs/MARGIN_REFACTOR_PLAN.md` | Plan détaillé |
| `docs/PRICING_SYSTEM_SUMMARY.md` | Résumé complet |
| `docs/MODIFICATIONS_COMPLETED.md` | Récapitulatif |
| `docs/QUICK_START_PRICING.md` | Guide rapide |

---

## 🚀 Migration Rapide

### Commandes Essentielles

```bash
# 1. Simulation (sûr, aucune modification)
npm run migrate:margin:dry

# 2. Migration réelle (après vérification)
npm run migrate:margin

# 3. Aide détaillée
tsx scripts/migrate-margin-rate.ts --help
```

---

## 📊 Système de Prix - Vue Simplifiée

### Formule de Calcul

```
Prix Final = (Coût + Frais) × (1 + Marge%) + Transport

Où:
- Coût = baseCost OU (price1688 × exchangeRate)
- Frais = Service Fee + Assurance (si import)
- Marge = 0% par défaut (ajustable)
- Transport = selon mode (air/mer) si pas en stock
```

### Exemple Concret

```
Produit Import 1688:
├─ Prix 1688: 350 ¥
├─ Taux: 100 FCFA/¥
└─ Coût: 35,000 FCFA

Frais Import:
├─ Service (10%): 3,500 FCFA
├─ Assurance (2.5%): 875 FCFA
└─ Sous-total: 39,375 FCFA

Marge (0% défaut):
└─ Prix: 39,375 FCFA

Transport Air 15j (2kg):
└─ Total: 55,375 FCFA
```

---

## ✅ Fonctionnalités Vérifiées

### Prix Dégressifs (priceTiers)
✅ **Fonctionnel**  
Structure : `{ minQty, maxQty, price, discount }`  
Fichiers : `ProductDetailSidebar.tsx`, `achats-groupes/[groupId]/page.tsx`

### Variantes (variantGroups)
✅ **Fonctionnel**  
Structure : `{ name, variants: [{ id, name, image, price1688 }] }`  
Fichiers : `ProductDetailExperience.tsx`, `api/products/route.ts`

---

## 🎓 Parcours de Lecture

### Pour Administrateurs

1. **Démarrer** : `QUICK_START_PRICING.md`
2. **Comprendre** : `PRICING_SYSTEM_SUMMARY.md` (sections non techniques)
3. **Migrer** : Suivre les instructions de migration
4. **FAQ** : Section questions dans `QUICK_START_PRICING.md`

### Pour Développeurs

1. **Vue d'ensemble** : `MODIFICATIONS_COMPLETED.md`
2. **Détails techniques** : `MARGIN_REFACTOR_PLAN.md`
3. **Système complet** : `PRICING_SYSTEM_SUMMARY.md`
4. **Analyse approfondie** : `PRICING_ANALYSIS.md`
5. **Code** : Lire les fichiers modifiés avec commentaires

### Pour Comptables

1. **Impact** : Section "Comptabilité" dans `MARGIN_REFACTOR_PLAN.md`
2. **Calculs** : Section "Formule" dans `PRICING_SYSTEM_SUMMARY.md`
3. **Transparence** : Comparaison avant/après dans `MODIFICATIONS_COMPLETED.md`

---

## 📞 Support & Ressources

### Documentation Technique

- **Modèle Product** : `src/lib/models/Product.ts`
- **Calcul prix** : `src/lib/logistics.ts`
- **API import** : `src/app/api/products/import/route.ts`
- **Script migration** : `scripts/migrate-margin-rate.ts`

### Tests

```bash
# Tester le système de pricing
npm run test:pricing

# Tester les fonctionnalités
npm run test:features
```

### Commandes Utiles

```bash
# Migration
npm run migrate:margin:dry    # Simulation
npm run migrate:margin         # Migration réelle

# Import
npm run import:aliexpress     # Import avec marge 0%

# Base de données
npm run db:push               # Sync Prisma
npm run seed:admin            # Créer admin
```

---

## 🔍 Recherche Rapide

### Par Sujet

| Sujet | Document | Section |
|-------|----------|---------|
| Migration produits | `QUICK_START_PRICING.md` | Migration |
| Marge commerciale | `MARGIN_REFACTOR_PLAN.md` | État actuel |
| Calcul prix | `PRICING_SYSTEM_SUMMARY.md` | Formule |
| Prix dégressifs | `PRICING_SYSTEM_SUMMARY.md` | Prix Dégressifs |
| Variantes | `PRICING_SYSTEM_SUMMARY.md` | Variantes |
| Tests | `MODIFICATIONS_COMPLETED.md` | Tests |
| FAQ | `QUICK_START_PRICING.md` | Questions |
| Comptabilité | `MARGIN_REFACTOR_PLAN.md` | Impact Comptabilité |

### Par Rôle

| Rôle | Documents à lire |
|------|------------------|
| **Admin** | `QUICK_START_PRICING.md`, `PRICING_SYSTEM_SUMMARY.md` (sections non tech) |
| **Développeur** | Tous (ordre suggéré ci-dessus) |
| **Comptable** | `MARGIN_REFACTOR_PLAN.md` (impact), `PRICING_SYSTEM_SUMMARY.md` (formule) |
| **Chef de projet** | `MODIFICATIONS_COMPLETED.md`, `PRICING_SYSTEM_SUMMARY.md` |

---

## 📅 Historique

### v2.0.0 (2025-01-XX)
- ✅ Changement marge par défaut : 25% → 0%
- ✅ Script de migration créé
- ✅ Documentation complète (5 documents)
- ✅ Tests à effectuer documentés
- ✅ Vérification prix dégressifs et variantes

### v1.0.0 (Avant)
- Marge automatique 25%
- Prix dégressifs fonctionnels
- Variantes avec images

---

## 🎯 Prochaines Étapes

### Court Terme (Recommandé)
- [ ] Exécuter migration (`npm run migrate:margin`)
- [ ] Tester création produit (marge 0%)
- [ ] Ajuster marges manuellement selon stratégie
- [ ] Former équipe admin sur nouveau système

### Moyen Terme (Optionnel)
- [ ] Améliorer interface admin (champ marge visuel)
- [ ] Créer dashboard comptable (vue marges)
- [ ] Implémenter taux de change dynamique
- [ ] Ajouter validations/alertes marges

### Long Terme (Évolution)
- [ ] Export comptable avec breakdown détaillé
- [ ] Historique changements de prix
- [ ] Analyse rentabilité par produit/catégorie
- [ ] Système de promotions avancé

---

## ❓ Besoin d'Aide ?

1. **Consulter la documentation** dans ce dossier
2. **Tester en simulation** : `npm run migrate:margin:dry`
3. **Lire les commentaires** dans le code modifié
4. **Vérifier les logs** du script de migration

---

**Dernière mise à jour** : 2025-01-XX  
**Version système** : 2.0.0  
**Statut** : ✅ Documentation complète et à jour
