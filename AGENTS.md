# Règles du dépôt — à lire avant toute modification

Ce dépôt héberge **3 produits** partageant un backend Next.js + MongoDB :
- **corporate** — IT Vision B2B (portail-entreprise, interventions, contrats, admin)
- **market** — DDM+ marketplace import Chine (`market.itvisionplus.sn`)
- **xeuy** — app mobile de mise en relation de services (consumer+provider, fusion prévue en dernier sur branche dédiée)

## Frontière contractuelle

`src/lib/domains.ts` est la **source unique de vérité** : chaque page, API et modèle y est classé par domaine. Le middleware (`src/lib/middleware/routes.ts`) en dérive — ne plus éditer de listes de routes à la main.

## Règles obligatoires

1. **Un agent = un domaine.** Ne jamais importer un modèle d'un autre domaine dans une route (sauf modèles `shared`, et routes `admin`/`shared` transversales). Vérifier : `npm run test:boundaries`.
2. **Toute nouvelle route ou modèle** doit être déclaré dans `src/lib/domains.ts`, sinon `npm run test:domains` échoue.
3. **Pas de code mort** : ne pas garder de page/composant orphelin « au cas où ». Marquer `deprecated` dans le registre, supprimer.
4. **Responsivité globale** : tout composant nouveau ou modifié doit être responsive (mobile → desktop), sans exception. Pas de vue desktop-only ni de doublon mobile.
5. **Interactions inter-domaines** via événements (`<domaine>:<entité>:<action>`) ou `/api/internal/*` — jamais par import direct.
6. **Socket.io** : tout nouvel événement doit être namespacé (`corp:`, `mkt:`, `xeuy:`) — voir `src/lib/socket-events.ts`. Ne pas renommer les events legacy tant que les apps déployées les utilisent.
7. **Auth** : `verifyAuthServer()` seul helper côté API ; le scoping par profil (`companyClientId`, `providerProfileId`...) prime sur le rôle global.
8. **Avant de merger** : `npm run test:domains` + `npm run test:boundaries` + `npm run test:e2e` sur les domaines touchés.

## Commandes utiles

```bash
npm run test:domains        # cohérence du registre de domaines
npm run test:boundaries     # rapport violations cross-domaine (-- : --strict pour CI)
npm run test:e2e            # filet de non-régression Playwright
```

## Documents de référence

- `PLAN_ARCHITECTURE_3_DOMAINES.md` — cartographie et feuille de route
- `AUDIT_GLOBAL_SORTIE_MONOLITHE.md` — stratégie de sortie du monolithe
