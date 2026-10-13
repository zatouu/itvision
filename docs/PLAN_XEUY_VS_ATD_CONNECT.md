# Plan — Xeuy vs ATD Connect (concurrent)

Source concurrente : `C:\Users\ASUS\Downloads\ATD_Connect_32_ecrans\ATD_Connect` (32 écrans, 12 planches).
Objectif : lancer avant eux avec un produit au moins aussi propre, en couvrant l'essentiel **hors tontines et livraison**.

---

## 1. Matrice de couverture fonctionnelle

| Fonctionnalité ATD Connect | Statut Xeuy | Détail |
|---|---|---|
| Auth tél + OTP, choix langue, consentement | ✅ Couvert | `login`, `verify-otp`, `role-choice` — consentement RGPD à ajouter au signup |
| FR + Wolof | ✅ Couvert | i18n `fr/wo/en` (~1300 clés chacune) — **argument marketing à pousser** |
| Demande de service vocale + détection auto catégorie | ✅ Couvert | `VoiceRecorder` + `AiClarifyModal` + `/api/ai` dans `create-request` |
| Matching prestataires (vérifié, note, prix, dispo) | ✅ Couvert | `offers/[requestId]` avec scoring prix/ETA/note — afficher le **% de match** |
| Profil pro (photo, spécialités, portfolio, avis, devis) | ✅ Couvert | `pro-profile`, `profile-detail`, `portfolio`, `reviews` |
| Chat + pièces jointes (devis PDF) | ⚠️ Partiel | `mission-chat` existe mais **par mission uniquement** — pas d'inbox ; PJ à vérifier |
| Suivi commande (timeline + photos d'avancement) | ✅ Dépasse | `mission` + `mission-log` + **GPS live + ETA** (ATD n'a pas ça) ; photos d'avancement via chat à formaliser |
| Avis / notation | ✅ Couvert | `rate-mission`, `reviews` |
| Paiement Mobile Money | ✅ Dépasse | Wave (+QR), OM, Free Money, cash, **escrow**, wallet, retraits |
| Notifications | ✅ Couvert | `notifications` + push + socket |
| Passeport professionnel + QR identité | ⚠️ Partiel | Profil existe ; **pas de carte QR partageable** — `react-native-qrcode-svg` déjà installé |
| Onboarding vocal (décrire son activité → fiche auto) | ⚠️ Partiel | La voix existe côté demande ; `onboarding-provider` est formulaire — ajouter option voix |
| Assistant IA global (orbe, conversationnel FR/WO) | ❌ Manque | L'IA est cantonnée au flux de création de demande |
| Opportunités (emplois, appels à projets) + Formations | ❌ Manque | Aucun module équivalent |
| Communautés / Groupements / Projets collaboratifs | ❌ Manque | Gros différenciateur ATD, mais lourd |
| Marketplace produits artisanaux + panier | ❌ Manque | Hors scope Xeuy — **DDM+ existe déjà** comme produit séparé |
| Confidentialité / RGPD (export, suppression, toggles) | ❌ Manque | **Bloquant stores** : pas d'écran privacy, pas de suppression de compte |
| Admin : pilotage, carte Sénégal, modération, référentiel métiers | ⚠️ Partiel | `admin/services` existe côté web — à auditer vs file de modération + carte |
| Tontines | — Exclu | Suivi sans détention de fonds (leur angle) |
| Transport / livraison | — Exclu | Covoiturage + suivi colis |

### Ce que Xeuy a et qu'ATD n'a PAS (à mettre en avant)

- **Tracking GPS temps réel** du prestataire + ETA (socket.io) — le "Uber-like" qu'ils n'ont pas
- **Mode urgence** (`urgent-eligibility`, dispatch immédiat)
- **Escrow** + wallet pro + retraits
- **Litiges avec preuves** (`dispute`, `DisputeEvidence`)
- Premium/abonnements pro, `performance`, `badges`, `calendar`
- File hors-ligne (`OfflineQueueBadge`) — crucial terrain
- Cycle de mission à 11 statuts vs ~5 chez eux

**Verdict : sur le cœur "mise en relation de services", Xeuy est déjà plus complet.** Les vrais trous : RGPD (bloquant), inbox messages, passeport QR, assistant IA, et tout le pan communautaire/marketplace.

---

## 2. Écart UI/UX — ce qui rend ATD "propre"

Leur identité : fond crème chaud, titres **serif éditoriaux**, voix omniprésente (orbe + waveform), cartes photo généreuses, badges de confiance visibles, bottom nav constante.

Chez Xeuy : design system déjà solide (`design.ts` : couleurs/spacing/radius/typography/shadows) mais fond gris froid `#F4F6F9`, typographie utilitaire, navigation consumer par header + side menu (TabBar seulement côté pro).

| Axe | Action concrète | Effort |
|---|---|---|
| Chaleur visuelle | Passer `colors.bg` vers un neutre chaud (`#FAF8F4`) + ajuster `bgDeep`/`divider` en conséquence | S |
| Typographie éditoriale | Titres en serif (`expo-google-fonts` Fraunces ou Playfair) sur h1/h2/heroes uniquement | S |
| Nav consumer | Réutiliser `TabBar.tsx` côté client : Accueil / Explorer / Messages / Profil | M |
| Voix héroïque | Composant `VoiceOrb` (mic + waveform animée) réutilisable dans create-request, onboarding pro, futur assistant | M |
| Cartes pro riches | Avatar + 3 thumbs portfolio + badge vérifié + **chip "% match"** (score déjà calculé `offers/[requestId].tsx:230`) | S |
| Preuve sociale home | Strip stats (membres, missions, prestataires en ligne — `onlineProviders` existe déjà) + NearbyStrip photo | S |
| Micro-polish | États vides illustrés (`EmptyState` existe — vérifier usage partout), haptics (déjà `haptics.ts`), skeletons systématiques | M |

---

## 3. Plan de lancement — priorisé pour la vitesse

### P0 — Avant lancement (bloquant + différenciant immédiat)

1. **Écran Confidentialité/RGPD** — *bloquant Play Store/App Store* : profil public on/off, localisation, télécharger mes données, **supprimer mon compte** (endpoint + flow). Sans ça, refus store quasi certain.
2. **Refresh visuel P0** : fond chaud + serif titres + VoiceOrb sur create-request + chip % match + badges vérifiés mis en avant.
3. **Inbox Messages** : liste des conversations (aggrégation des `mission-chat` actifs/récents) — 1 écran + 1 endpoint.
4. **Passeport pro + QR** : carte identité `SN-XXXX` + `react-native-qrcode-svg` (déjà en deps) + bouton partager — *fort effet démo terrain*.
5. **TabBar consumer** + `NearbyStrip`/carte en "Explorer".

### P1 — Fast-follow (2-4 semaines post-launch)

6. **Assistant IA v1** : écran chat (orbe + bulles + cartes résultats) branché sur `/api/ai` existant ; FR/WO via i18n. Réutilise l'infra AiClarify.
7. **Onboarding pro vocal** : "décris ton activité" → extraction métier/compétences (même pipeline IA que create-request).
8. **Photos d'avancement mission** : le pro poste des photos horodatées → timeline client (asynchrone, sans dépendre du chat).
9. **Admin modération** : file "à traiter" (profils à vérifier, litiges, catégories proposées) + carte couverture par région — audit `admin/services` d'abord.

### P2 — Différer explicitement (ne pas construire avant traction)

10. **Marketplace produits** → ne pas dupliquer : lien profond/bannière vers DDM+ (`market.itvisionplus.sn`) depuis le profil pro. La convergence se décidera avec la fusion.
11. **Communautés/Groupements/Projets** → vrai différenciateur ATD mais module lourd (membres, rôles, projets, boutique). À cadrer post-launch si traction.
12. **Opportunités/Formations** → version lite possible plus tard (flux statique de posts admin).

---

## 4. Recommandation stratégique

Leur maquette mise sur la **communauté et l'inclusion vocale/wolof**. Xeuy gagne déjà sur : temps réel, paiement séquestré, urgence, litiges, offline. Le lancement rapide se joue sur :

- **Bloquer les blocants** : RGPD/suppression compte (P0.1)
- **Volter leur storytelling** : le wolof, la voix, le passeport QR sont déjà à moitié construits — les finir coûte peu et raconte la même histoire qu'eux, en mieux (parce que réel, pas maquette)
- **Ne pas courir après** marketplace (DDM+ existe), tontines, livraison : hors scope assumé

Séquence suggérée : P0 en un sprint concentré → build APK → test terrain → P1 en parallèle du feedback.
