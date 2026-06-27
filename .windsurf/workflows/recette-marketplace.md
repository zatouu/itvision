---
description: Lancer l'agent recetteur QA du marketplace et trier le rapport d'anomalies
---

Cet agent parcourt seul le marketplace (sourcing, vente, achats groupés),
exerce les parcours clés et produit un rapport d'anomalies trié par sévérité.

La persona, la checklist et le format de rapport sont décrits dans
`tests/marketplace-qa/AGENT_RECETTEUR.md`. Adopte cette posture (recetteur
senior + utilisateur réel) pendant tout le déroulé.

1. Vérifier qu'un serveur dev tourne, sinon Playwright le démarre seul
   (`npx next dev` sur le port 3000, qui sert aussi `market.localhost`).

// turbo
2. Lancer le crawler QA marketplace :
```
npm run test:qa
```

3. Ouvrir le dernier rapport généré dans `tests/marketplace-qa/reports/`
   (fichier `qa-report-<timestamp>.md`) et lire la synthèse par sévérité.

4. Trier les anomalies : traiter d'abord 🔴 critical puis 🟠 high. Reproduire
   manuellement chaque anomalie critical/high pour la confirmer.

5. Pour chaque anomalie confirmée, localiser la cause dans le code
   (`src/app/`, `src/components/`, `src/app/api/`) et proposer un correctif
   minimal et ciblé.

6. Si un parcours ou une coquille manque à la couverture, étendre
   `tests/marketplace-qa/qa-agent.spec.ts` (nouvelle route/flow) ou
   `COMMON_TYPOS` dans `tests/marketplace-qa/qa-utils.ts`.

7. Re-lancer `npm run test:qa` jusqu'à 0 anomalie critique, puis consigner le
   reste en backlog priorisé.
