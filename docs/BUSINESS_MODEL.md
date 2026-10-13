# Ligey — Business Model & Monétisation

## Vision
Plateforme de mise en relation services à domicile au Sénégal (plomberie, électricité, climatisation, ménage, etc.)

---

## 3 Piliers de revenus

### 1. Commission par mission (core revenue)
| Acteur | Commission | Moment |
|--------|-----------|--------|
| Consumer | +5-10% frais de service | Ajouté au prix accepté |
| Provider | 15-20% commission | Prélevé sur le paiement reçu |

- Phase lancement : **0% commission** (croissance)
- Affiché clairement avant confirmation (transparence)

### 2. Abonnements Provider (récurrent)
| Plan | Prix/mois | Avantages |
|------|-----------|-----------|
| **Gratuit** | 0 FCFA | 5 missions/mois, rayon 5km, pas de badge |
| **Pro** | 5 000 FCFA (~€7.5) | Illimité, rayon 25km, badge "Pro vérifié", priorité résultats |
| **Premium** | 15 000 FCFA (~€23) | Tout Pro + boost visibilité, missions urgentes premium, analytics |

### 3. Services à valeur ajoutée
- **Boost visibilité** : 500-1000 FCFA pour top position 24h
- **Badge KYC vérifié** : gratuit, augmente confiance → plus de missions
- **Publicité locale** : quincailleries/fournisseurs ciblant les techniciens
- **Marketplace pièces/matériel** : commission vendeur (phase 3)
- **Ligey Business** : offre B2B pour syndics, entreprises, hôtels

---

## Stratégie paiement (Sénégal)

| Méthode | Part marché | Priorité | API |
|---------|------------|----------|-----|
| **Wave** | ~60% | P0 | wave.com/developers |
| **Orange Money** | ~30% | P1 | Orange API |
| **Free Money** | ~8% | P2 | Free Money API |
| **Carte bancaire** | <5% (diaspora) | P3 | Stripe |

**Wave** = choix MVP : API simple, frais 1%, adoption massive.

---

## Roadmap monétisation

```
Phase 1 (0-6 mois) : CROISSANCE
├─ 0% commission → acquérir providers et consumers
├─ Paiement hors-app (cash/Wave direct entre users)
└─ Focus : volume de missions + reviews + NPS

Phase 2 (6-12 mois) : MONÉTISATION DOUCE
├─ Abonnements Pro (5000 FCFA/mois)
├─ Paiement in-app Wave (optionnel, pas forcé)
├─ Boosts payants
└─ KYC payant pour accéléré (sinon gratuit sous 48h)

Phase 3 (12+ mois) : MONÉTISATION PLEINE
├─ Commission 10-15% sur paiements in-app
├─ Orange Money + Free Money
├─ Marketplace pièces/matériel
├─ Ligey Business (B2B)
└─ Assurance mission (partenariat assureur local)
```

---

## Projections financières

### Hypothèses conservatrices
- Panier moyen : 25 000 FCFA/mission
- Croissance : +20% missions/mois les 12 premiers mois

### Revenus à 12 mois
| Source | Calcul | Revenu/mois |
|--------|--------|-------------|
| Commission (1000 missions × 15%) | 1000 × 25000 × 0.15 | 3 750 000 FCFA |
| Abonnements (100 Pro) | 100 × 5000 | 500 000 FCFA |
| Boosts (50/jour) | 50 × 500 × 30 | 750 000 FCFA |
| **Total** | | **~5 000 000 FCFA/mois (~€7 600)** |

### Revenus à 24 mois (objectif)
- 5000 missions/mois → 18.75M FCFA commission
- 500 Pro + 50 Premium → 3.25M FCFA abonnements
- **Total : ~22M FCFA/mois (~€33 500)**

---

## Coûts estimés

| Poste | Montant/mois |
|-------|-------------|
| Serveurs (AWS/Hetzner) | 50 000 - 150 000 FCFA |
| SMS OTP (Twilio/local) | ~100 FCFA/OTP × volume |
| Support client | 200 000 - 500 000 FCFA |
| Marketing terrain | 500 000 - 1 000 000 FCFA |
| **Break-even estimé** | **~800 missions/mois** |

---

## Métriques clés (KPIs)

- **GMV** (Gross Merchandise Value) : volume total des transactions
- **Take rate** : % commission effective
- **LTV provider** : durée moyenne × revenu/provider
- **CAC** : coût acquisition client/provider
- **Missions/provider/mois** : indicateur satisfaction provider
- **Taux de complétion** : missions terminées/créées
- **NPS** : satisfaction globale

---

## Avantages compétitifs

1. **Mobile-first** : 95% du marché cible est mobile-only
2. **Wave intégré** : frictionless pour le paiement
3. **Géolocalisation temps réel** : matching provider/consumer optimal
4. **Reviews bilatéraux** : confiance et qualité
5. **Multi-catégorie** : one-stop-shop services domicile

---

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Désintermédiation (users qui s'échangent le numéro) | Valeur ajoutée (garantie, assurance, reviews) |
| Providers qui refusent la commission | Phase gratuite longue → habitude + valeur prouvée |
| Concurrence (Yassir Services, etc.) | Spécialisation locale + UX supérieure |
| Régulation | Conformité proactive (ADIE, données perso) |
