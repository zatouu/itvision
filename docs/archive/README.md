# Archives documentaires

Ces documents sont des **comptes rendus de travaux terminés** (refontes, correctifs,
phases livrées, guides d'une fonctionnalité passée). Ils sont conservés pour
l'historique et le contexte, mais ne décrivent plus l'état courant du code.

## Où chercher quoi

| Besoin | Document à jour |
| --- | --- |
| Règles de contribution, frontière des domaines | `AGENTS.md` |
| Cartographie corporate / market / xeuy | `PLAN_ARCHITECTURE_3_DOMAINES.md` |
| Stratégie de sortie du monolithe | `AUDIT_GLOBAL_SORTIE_MONOLITHE.md` |
| Pricing, panier, achats groupés, import | `docs/*.md` (racine de `docs/`) |
| Registre des routes/modèles par domaine | `src/lib/domains.ts` (source de vérité) |

## Règle

Ne pas réactiver un document archivé comme référence d'implémentation : vérifier
d'abord dans le code. Si un contenu archivé redevient pertinent, le réécrire dans
`docs/` à partir de l'état réel du code.
