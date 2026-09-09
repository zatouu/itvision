# Xeuy Bi — Brief GenSpark : Coach mission IA + écrans manquants de l'app unifiée

> À coller dans GenSpark (section « Prompt ») avec `brand.jsx` en pièce jointe.  
> Cible : une seule app Expo (`mobile/app`), client & prestataire dans le même binaire.  
> Livrable : canvas JSX par écran (`*.jsx`), mobile 390×844, tokens `XB` de `brand.jsx`.  
> L'implémentation finale sera en `.tsx` dans `mobile/app` en utilisant les tokens de `src/design.ts`.

---

## 0. Contexte produit

- **Une seule app**, deux **modes applicatifs** : `client` (je demande un service) et `provider` (j'interviens).
- La capacité prestataire vient de la **présence d'un `ProviderProfile`** (`providerProfileId`), jamais d'un rôle global seul.
- L'utilisateur bascule de mode sans se déconnecter (`src/mode.ts`).
- Public cible : artisans sénégalais, souvent en plein soleil, mains sales, téléphone tenu d'une main, peu de saisie au clavier.

### Règles UX non négociables

1. **Zéro saisie obligatoire** : pucer / cocher au pouce. Boutons ≥ 52 px de haut, cibles ≥ 48 px.
2. **Une action principale par écran**, en bas, pleine largeur, couleur `XB.ink`.
3. **Textes simples** : impératif, 1 idée par ligne, pas de jargon.
4. **Contraste fort** (soleil) : fond `XB.surface` / `XB.app`, texte `XB.text`. Pas de gris clair sur gris.
5. **Sécurité en premier** et en `XB.amber` / `XB.red`.

### Système de design (référence)

Utilise strictement `brand.jsx` pour la forme. Pour l'implémentation future, mappera vers `mobile/app/src/design.ts` :

| `brand.jsx` | `design.ts` |
|---|---|
| `XB.ink` | `colors.ink` |
| `XB.text` | `colors.text` |
| `XB.textDim` | `colors.textDim` |
| `XB.surface` | `colors.surface` |
| `XB.app` | `colors.bg` |
| `XB.green` | `colors.primary` |
| `XB.greenSoft` | `colors.brandSoft` |
| `XB.greenInk` | `colors.brandInk` |
| `XB.amber` | `colors.warning` |
| `XB.amberSoft` | `colors.warningLight` |
| `XB.cat.elec.bg` | `colors.info` |
| `XB.cat.elec.soft` | `colors.infoLight` |
| `XB.border` | `colors.border` |
| `XB.radius.lg` | `radius.lg` |
| `XB.shadow.md` | `shadows.md` |

Réutilise `Icon`, `CatTile`, `Avatar`, `TabBar`, `MiniMap` existants de `brand.jsx`. Pour l'app, icônes = `lucide-react-native`.

---

## 1. Coach mission IA — rappel du backend

Chaque mission reçoit, à chaque changement d'état, un objet `aiCoach` :

```ts
type StructuredAdvice = {
  title: string
  summary?: string
  sections: Array<{
    icon: 'tools' | 'check' | 'warning' | 'steps' | 'parts' | 'client' | 'info' | 'eye' | 'clock'
    title: string
    items: string[]
  }>
  askClient?: string[]
  sayToClient?: string
  difficulty?: 'Simple' | 'Moyen' | 'Complexe'
  durationMinutes?: { min: number; max: number }
}
```

Mapping statut → fiche attendue :

| Statut | Fiche | Intention |
|---|---|---|
| `assigned` (= `accepted` côté API) | **À emporter** | Matériel & outils, vigilance, questions au client |
| `on_the_way` / `provider_arriving` | **En route** | Confirmer heure, numéro client, repérer l'accès |
| `arrived` | **Avant de commencer** | Sécurité, inspection, prix |
| `in_progress` | **Diagnostic guidé** | Causes, étapes, contrôles qualité |
| `paused` | **Pièces à trouver** | Pièces, où les trouver, message client |
| `awaiting_validation` | **Compte-rendu** | Nettoyer, tester, expliquer, envoyer compte-rendu |

Mapping icône → `Icon` : `tools→wrench`, `check→check`, `warning→alert` (triangle), `steps→arrow`, `parts→grid`, `client→user`, `info→dots`, `eye→search`, `clock→clock`.

---

## 2. Écrans Coach — livrables

### 2.1 `coach-card.jsx`

Carte compacte à insérer dans l'écran Mission active. **2 layouts** :

- **Layout A** (`assigned`, `on_the_way`, `provider_arriving`) : carte dans le bottom-sheet, sous la timeline, au-dessus de la carte client.
- **Layout B** (`arrived`, `in_progress`, `paused`, `awaiting_validation`) : carte dans le scroll, sous la timeline, avant le footer.

Contenu (hauteur 96–110 px, fond `XB.greenSoft`, arrondi `XB.radius.lg`) :
- Rangée 1 : `Icon sparkle` rond blanc + **titre fiche** (14/700) + chip « Étape X/5 » droite (fond blanc, 11/700 `XB.greenInk`).
- Rangée 2 : `summary` 13/500, 2 lignes max.
- Rangée 3 : 2 mini-puces (icône `check` + texte 12.5, 1 ligne) + « Voir tout ▸ » en `XB.greenInk`.

**États** à dessiner :
- `loading` : 3 barres skeleton, texte « Le coach prépare vos conseils… »
- `ready` : contenu normal
- `unavailable` : carte neutre `XB.appDeep`, texte « Conseils indisponibles hors ligne » + « Réessayer » texte

### 2.2 `coach-sheet.jsx`

Bottom-sheet plein contenu (88 % hauteur, poignée, fond `XB.surface`).

**Header** : `Icon sparkle` + « Coach mission » (17/700) ; sous-titre = titre fiche + chip statut ; bouton X 44×44.

**Corps (scroll)** :
1. Bandeau `summary` (`XB.greenSoft`, 14/600).
2. **Carte par section** : icône ronde 32 px (`warning` = `XB.amberSoft` + `XB.amber`, sinon `XB.appDeep` + `XB.ink`) ; titre 14/700 ; items avec **case ronde 28 px** cochable (barré + `XB.textDim` quand coché). Sections `warning` **toujours en premier**, bord gauche 3 px `XB.amber`.
3. Si `difficulty` / `durationMinutes` : 2 chips info.
4. Si `askClient` : carte « À demander au client » (`user`) en puces « ? ».
5. Si `sayToClient` : carte « À dire au client » (`chat`, fond `XB.cat.elec.soft`) : texte entre guillemets + bouton « Envoyer dans le chat » (`XB.ink`, `send`) ; au tap → état `sending` puis toast « Message envoyé ».

**Zone « J'ai une question »** (MVP : puces + photo, **pas de champ texte**) :
- Titre 13/700 « Une difficulté ? Choisissez : ».
- **Puces horizontales** 40 px haut, `XB.radius.pill`, bord `XB.border`, fond blanc ; actif = fond `XB.ink`, texte blanc. Libellés exacts selon le statut :
  - `assigned`/`on_the_way` : « Quel matériel ? », « Adresse introuvable », « Client injoignable », « Combien de temps ? »
  - `arrived` : « Pas ce qui était décrit », « Danger », « Client demande autre chose », « Par où commencer ? »
  - `in_progress` : « Ça ne marche pas », « Pièce manquante », « Autre chose que prévu », « Client demande un extra »
  - `paused` : « Où trouver la pièce ? », « Combien facturer ? », « Client s'impatiente »
  - `awaiting_validation` : « Client ne valide pas », « Client conteste », « Comment expliquer »
- Sous les puces : **bouton « Photo »** (52×52, `XB.appDeep`, icône `camera`) pour montrer au coach ce qu'on a devant soi — optionnel. Après prise : vignette 56×56 avec X. Une puce **ou** une photo suffit pour déclencher la demande.
- Tap sur une puce (ou « Demander » si photo seule) : affiche la **réponse inline** en haut du corps (même rendu sections : Cause probable `eye`, Étapes `steps`, Sécurité `warning`, À dire au client `client` + bouton envoyer) avec titre « Réponse : “question” ».
- Bouton texte « Nouvelle question » remet à zéro.
- Ligne discrète sous la zone : « 2 aides gratuites aujourd'hui » (compteur).

**Footer collant** : reprend l'action de l'étape (« Je suis arrivé », « Commencer », « Terminer »).

**États à dessiner** :
- `ready`
- `réponse en cours` : skeleton + « Le coach réfléchit… »
- `quota épuisé` (le backend limite les questions à 2/jour) : puces grisées (`XB.textDim`, non cliquables), bouton Photo grisé, ligne « Vos aides du jour sont utilisées, revenez demain » — **sans** bouton Recharger ni mention XC. La fiche de l'étape reste lisible.
- `hors ligne` : « Vos conseils sont enregistrés. Les questions nécessitent le réseau », puces grisées.

### 2.3 `mission-active-coach.jsx`

Écrans complets (canvas de validation d'emplacement) :

- **État `on_the_way`** : Layout A (bottom-sheet) avec `CoachCard` repliée et `CoachSheet` ouverte.
- **État `arrived`** : Layout B (scroll) avec `CoachCard` étendue et footer.

Hiérarchie visuelle : hero statut → client → résumé → timeline → **coach** → footer. Rien d'autre ne change.

### 2.4 `nearby-analysis.jsx`

Écran `nearby/[id]` avec **carte analyse IA** ajoutée sous la description client.

- Bouton « Analyser cette demande » (`sparkle`, fond `XB.cat.elec.soft`).
- Après tap : remplacé par une rangée de 3 chips : **Difficulté**, **Durée estimée**, **Matériel (n)**.
- Sections repliées/accordéon (même composant que `CoachSheet`) :
  - « Ce que je vois sur les photos » (`eye`)
  - « Matériel probable » (`tools`)
  - « À clarifier avant l'offre » (`client`)
  - « Risques » (`warning`)
- CTA bas reste « Faire une offre » (`XB.ink`).

---

## 3. Écrans manquants de la fusion

### 3.1 `onboarding-provider.jsx`

Remplace l'alerte actuelle « Devenir prestataire ». 3 étapes + succès.

**Étape 1 — Pourquoi** :
- Hero illustré (outils + carte).
- 3 bénéfices (icône + texte) :
  - « Recevez des demandes près de chez vous »
  - « Fixez vos prix »
  - « Paiement sécurisé »
- Bouton bas « Continuer » (`XB.ink`).

**Étape 2 — Vos métiers** :
- Grille `CatTile` multi-sélection (coche verte).
- Chip « Autre ».
- Bouton « Continuer ».

**Étape 3 — Votre zone** :
- `MiniMap` avec rayon (slider 5–30 km, valeur en chip « 10 km »).
- Adresse détectée en texte.
- Bouton « Activer mon espace ».

**Écran succès** :
- « Votre espace prestataire est prêt »
- CTA principal « Découvrir mon accueil Pro » (vert `XB.green`).
- CTA secondaire « Vérifier mon identité (KYC) » (badge « Recommandé »).
- Mention : « Vous pourrez basculer Client / Pro à tout moment depuis le menu ».

### 3.2 `mode-switch.jsx`

#### Pilule de mode
Dans le header de `/` (client) et `/pro-home` (pro) : segment 2 positions **« Client | Pro »**, hauteur 32, fond `XB.appDeep`, segment actif blanc + ombre. Visible **uniquement** si l'utilisateur a un profil prestataire.

#### `ModeSwitchSheet`
Bottom-sheet 40 %, fond `XB.surface` :
- Titre « Passer en mode Prestataire ? » (ou « Client ? »).
- 3 lignes de ce qui change (icône + texte 13/500).
- CTA principal « Passer en mode Pro » (`XB.ink`) + « Annuler » secondaire.
- Version miroir pour repasser Client.

#### Bandeau inter-mode
- Sur l'accueil client : si une mission pro est en cours, bandeau `XB.greenSoft` : « Vous avez une mission en cours en mode Pro » + « Y aller ».
- Sur l'accueil pro : si le client a une demande avec offres en attente, bandeau bleu : « Vous avez une demande client en attente » + « Voir ».

### 3.3 `role-choice.jsx`

Après OTP, avant d'entrer dans l'app. 2 grandes cartes tactiles (hauteur 140) :

- **« Je cherche un service »** : bleu `XB.cat.elec.bg`, icône `search`. Sous-texte 1 ligne.
- **« Je propose mes services »** : vert `XB.green`, icône `wrench`. Sous-texte 1 ligne.
- Mention : « Vous pourrez faire les deux plus tard ».
- Bouton « Continuer ».

### 3.4 `drawer-mode.jsx`

Mise à jour du `SideMenu` / drawer.

- Dans le hero, sous le nom, chip du mode courant :  
  - « Mode Pro » vert (`XB.greenSoft` + `XB.greenInk`)  
  - « Mode Client » bleu (`XB.cat.elec.soft` + `XB.cat.elec.bg`)
- Bouton icône `swap` 40×40 à droite → ouvre `ModeSwitchSheet`.
- Si l'utilisateur n'a **pas** de profil prestataire : à la place du chip, lien « Devenir prestataire → ».
- Items du menu mode-aware : client (`/`, `/my-requests`, `/wallet`, `/profile`) ; pro (`/pro-home`, `/nearby-requests`, `/my-offers`, `/pro-wallet`, `/pro-profile`).

---

## 4. Copies FR à utiliser

### Coach
- « Coach mission », « Voir tout », « Le coach prépare vos conseils… », « Conseils indisponibles hors ligne », « Réessayer »
- « À dire au client », « Envoyer dans le chat », « Message envoyé », « À demander au client »
- « Une difficulté ? Choisissez : », « Photo », « Demander », « Nouvelle question », « Le coach réfléchit… », « Réponse : “…” »
- « 2 aides gratuites aujourd'hui », « Vos aides du jour sont utilisées, revenez demain », « Vos conseils sont enregistrés. Les questions nécessitent le réseau »
- Puces (libellés exacts, voir 2.2) : « Quel matériel ? », « Adresse introuvable », « Client injoignable », « Combien de temps ? », « Pas ce qui était décrit », « Danger », « Client demande autre chose », « Par où commencer ? », « Ça ne marche pas », « Pièce manquante », « Autre chose que prévu », « Client demande un extra », « Où trouver la pièce ? », « Combien facturer ? », « Client s'impatiente », « Client ne valide pas », « Client conteste », « Comment expliquer »

### Fusion
- « Devenir prestataire », « Vos métiers », « Votre zone », « Activer mon espace »
- « Votre espace prestataire est prêt », « Découvrir mon accueil Pro », « Vérifier mon identité (KYC) »
- « Passer en mode Pro », « Passer en mode Client », « Vous avez une mission en cours en mode Pro », « Y aller »
- « Je cherche un service », « Je propose mes services », « Vous pourrez faire les deux plus tard »

### Nearby
- « Analyser cette demande », « Ce que je vois sur les photos », « Matériel probable », « À clarifier avant l'offre », « Risques », « Faire une offre »

---

## 5. Livrables attendus

```
coach-card.jsx
mission-active-coach.jsx         // arrived (layout B) + on_the_way (layout A)
coach-sheet.jsx                  // ready + réponse en cours + quota épuisé + hors ligne
nearby-analysis.jsx
onboarding-provider.jsx          // 3 étapes + succès
mode-switch.jsx                  // pilule + sheet + bandeaux
role-choice.jsx
drawer-mode.jsx
```

Chaque fichier :
- expose ses composants via `Object.assign(window, {...})` comme `brand.jsx`
- contient des données mockées réalistes (plomberie « fuite sous l'évier », client « Mamadou K. », Dakar – Sacré-Cœur)
- français uniquement
- ne réinvente pas de couleurs (tokens `XB`)

---

## 6. Contraintes d'intégration (à garder en tête pour le dev ensuite)

- **Stack** : Expo Router, React Native, TypeScript, `lucide-react-native`, `i18next`.
- **Tokens réels** : `mobile/app/src/design.ts` (`colors`, `radius`, `spacing`, `shadows`, `typography`).
- **Mode** : `mobile/app/src/mode.ts` (`getMode`, `setMode`, `isProviderCapable`, `homeRouteForMode`).
- **Coach** : les données viennent de `/api/services/requests/[id]` (`aiCoach`) et du socket `ai:advice_updated`.
- **Routes** : flat (`/`, `/pro-home`, `/pro-profile`, `/pro-wallet`, `/nearby-requests`, `/my-offers`, `/active-mission/[id]`, `/nearby/[id]`, `/onboarding-provider` à créer).
- **Pas de saisie obligatoire** : l'action « question au coach » = tap sur une puce, ou photo. Pas de champ texte au MVP.
- **Photo** : aucune dépendance à ajouter — `expo-image-picker` (`captureMedia`) et `apiUpload` existent déjà dans `mobile/app` ; le backend accepte déjà les images (`imageUrls`).
- **Quota** : le backend répond `402 quota_exceeded` après 2 questions/jour → l'état « quota épuisé » de la sheet est obligatoire. Le paiement en XC existe côté serveur mais n'est **pas** exposé dans l'UI au MVP.

---

## 7. Ce qu'on exclut du MVP (garder pour une v2)

- Champ texte libre dans « J'ai une question ».
- Déblocage de questions supplémentaires par XC (« Recharger », prix par question, gratuité prestataire éligible).
- Bouton « Modifier » sur le message « À dire au client » (envoi tel quel au MVP).
- Appel vocal / dictée.
- Traduction wolof/anglaise des copies coach (seul le français est demandé ici).
