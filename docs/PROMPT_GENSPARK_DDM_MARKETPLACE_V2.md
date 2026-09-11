# Prompt GenSpark — Refonte DDM+ Marketplace v2

## Contexte
On a déjà un handoff mobile-first (zip 07) pour 6 écrans marketplace. On valide la **Home variante D** (capture jointe). Il faut maintenant élargir en **parcours client complet premium**, desktop 1280px + mobile 375px + dark mode.

## Direction visuelle
- Direction 01 · Safe — évolution douce, pas de rupture
- Palette : emerald-600, violet-600/700, amber-500, blue-600, slate-900/200/50
- Typo Inter uniquement
- Radius `rounded-2xl`, ombres douces
- Surfaces blanches/slate, dot pattern subtil sur les héros
- Composants partagés : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`

## Livrables
1. Prototype HTML unique `Prototype DDM+ v2.html`
2. Toggle mobile 375px / desktop 1280px
3. Toggle light / dark
4. Navigation latérale entre les 15 écrans
5. Dossier `proto/screen-*.jsx` avec les composants
6. `README.md` décrivant les écrans et les tokens de couleur

## Écrans à designer (15)

### Batch 1 — prioritaires
1. **Home v2 (Variante D)**
   - Héros violet dot-pattern, 3 pills data en haut gauche
   - H1 "Importez de Chine, à **prix usine**."
   - CTA "Explorer le catalogue" + "Trouvez-moi"
   - **Mosaïque 3×2 best-sellers à droite** avec fondus rotatifs (desktop) / scroll horizontal (mobile)
   - Badges `MIN X` ambre, `GROUPE` violet
   - Bandeau "EN DIRECT · Groupes en cours" en bas du héros
   - Sections : catégories, groupes, sourcing, MOQ, populaires, trust, testimonials

2. **Catalogue / Recherche (`/produits`)**
   - Barre de recherche sticky
   - Filtres sidebar desktop / drawer mobile
   - Tri : pertinence, prix croissant, économie, délai
   - Grille produits avec badges
   - Filtres : catégorie, prix (range), lot minimum (1-4 / 5-9 / 10-24 / 25+), groupe actif, fournisseur vérifié, économie (-20% / -30% / -40%)

3. **Compte client dashboard (`/compte`)**
   - Bloc "Prochaine livraison" avec preview commande active
   - Stats perso : économies totales, groupes rejoints, commandes
   - Raccourcis : Mes commandes, Mes groupes, Favoris, Adresses, Paiement
   - Programme fidélité / grains
   - Card support WhatsApp direct

4. **Mes commandes (`/compte/commandes`)**
   - Liste par statut
   - Cards avec image, n°, montant, statut, date
   - Filtres : en cours, livrées, groupées, litiges

5. **Suivi commande (`/suivi/[reference]`)**
   - Timeline verticale 5 étapes : Commandé → Sourcing → Chine → Transport → Livré
   - Placeholder map + numéro de suivi
   - Card produit + contact WhatsApp

### Batch 2 — parcours achat
6. **Fiche produit**
7. **Panier**
8. **Checkout adresse**
9. **Paiement succès** — sobre : check emerald + résumé + timeline "Prochaines étapes" + 2 CTAs
10. **Achats groupés listing**
11. **Détail groupe**

### Batch 3 — marketplace avancée
12. **Page boutique / vendeur (`/vendeur/[slug]`, `/boutiques/[shopId]`)**
    - Deux types de vendeurs : usine chinoise (badge "Inspecté par DDM+") et shop partenaire sénégalais/AO
    - Header avec logo, note, années, catégories
    - Onglets : Produits, Avis, À propos, Conditions

13. **Demande sourcing "Trouvez-moi" (`/market/sourcing/[token]`)**
    - Page dédiée avec formulaire complet : photo, lien, texte, budget cible, quantité, délai souhaité
    - Étapes visuelles "Comment ça marche"
    - FAQ
    - + modale de raccourci depuis la Home

14. **Tarification / Prix transparent (`/tarification` + `/prix-transparent`)**
    - Section 1 : décomposition interactive d'un prix type (Prix usine + Service 4% + Assurance 1,5% + Transport variable + Grains)
    - Section 2 : comparatif Achat seul vs Groupé vs Palier avec exemples chiffrés

15. **Devenir vendeur / Espace vendeur (`/devenir-vendeur`, `/espace-vendeur`)**
    - Page landing pour inscription vendeur
    - Bénéfices, étapes, formulaire contact
    - Espace vendeur : mini dashboard

## Contraintes
- Mobile-first, responsive jusqu'à 1440px
- Dark mode pour chaque écran
- Icônes `lucide-react`, pas de SVG inline
- Mock data **full anonymes** : "Client A", "Commande #001" + disclaimer visible "Données de démonstration"
- Pas de nouvelles routes/API côté backend
- Pas de mock data qui semble réelle (n° de suivi, entreprises, vrais noms)
- Composants réutilisables, cohérents avec la Direction 01

## Références
- Dossier existant : `docs/design_handoff_ddm_plus_6_screens/`
- Composants partagés : `src/components/market/`, `src/components/home/`
- Middleware domaine : `src/lib/middleware/domain.ts`
