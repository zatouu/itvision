# Roadmap DDM+ — Standards des marketplaces modernes

> Roadmap priorisée et enchaînée pour aligner la plateforme avec les pratiques des leaders e-commerce.
> Les numéros correspondent aux tâches du TODO list.

## Phase 1 — Fondations données & découverte
| # | Tâche | Priorité | Dépendances |
|---|-------|----------|-------------|
| 8 | Analytics e-commerce (GA4 / Mixpanel) – schema events produit → panier → paiement | Haute | — |
| 9 | Structured data SEO produit (Product, Offer, AggregateRating, BreadcrumbList, FAQPage) | Haute | — |
| 10 | Autocomplete / recherche intelligente (suggestions, historique, tendances) | Haute | — |
| 11 | Moteur de recherche avancé (Meilisearch/Algolia : fuzzy search, facettes, synonymes) | Haute | #10 |
| 12 | Performance & PWA : next/image WebP/AVIF, Core Web Vitals, service worker, manifest, prefetch | Haute | — |
| 13 | Accessibilité WCAG 2.1 AA : contrastes, ARIA, keyboard nav, tests a11y Playwright | Moyenne | — |
| 22 | Sécurité & conformité : audit CSP/RGPD, validation Zod, rate limiting, secrets | Haute | — |

## Phase 2 — Conversion & confiance
| # | Tâche | Priorité | Dépendances |
|---|-------|----------|-------------|
| 14 | Paiements & marketplace : Mobile Money (Wave/OM/Free), cartes, split vendeur, wallet | Haute | #8 (funnel) |
| 15 | Confiance & vendeurs : avis enrichis (photos/vidéos), KYC vendeur, badge vérifié, Q&A produit | Haute | — |
| 16 | Conversion : panier invité, wishlist, récupération panier abandonné, quick view | Moyenne | — |
| 17 | Notifications push & expérience offline : rappels, statut commande, cache mobile | Moyenne | — |

## Phase 3 — Scale & expansion
| # | Tâche | Priorité | Dépendances |
|---|-------|----------|-------------|
| 18 | Espace vendeur : dashboard stock, commandes, analytics, storefront public | Moyenne | #15 |
| 19 | Logistique : suivi transporteur, estimation livraison, retours & remboursements | Moyenne | — |
| 20 | Internationalisation & multi-devises : FR/EN/WOLOF, XOF/USD/EUR | Moyenne | — |
| 21 | Growth & A/B testing : funnels avancés, cohortes, tests de prix/CTA | Basse | #8 |

## Logique d’enchaînement
1. **Analytics (#8)** en premier car il instrumente les conversions et valide l’impact des phases suivantes.
2. **SEO structured data (#9)** et **autocomplete (#10)** apportent rapidement du trafic qualifié.
3. **Moteur de recherche (#11)** repose sur l’autocomplete et le catalogue déjà propre.
4. **Paiements (#14)** et **confiance vendeur (#15)** se déclenchent dès que le funnel est mesurable.
5. **Espace vendeur (#18)** vient après la confiance/KYC vendeur.
6. **Growth & A/B testing (#21)** en dernier, quand assez de données sont collectées via #8.
