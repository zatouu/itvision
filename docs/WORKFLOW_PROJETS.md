# Workflow projets, devis/factures et documents

Source de vérité : [`src/lib/projects/workflow.ts`](../src/lib/projects/workflow.ts) (phases, transitions, tâches)
et [`src/lib/finance/project-finance.ts`](../src/lib/finance/project-finance.ts) (montants).

## Cycle de vie d'un projet

| Phase | Clé | Entrée |
|---|---|---|
| Prospect | `lead` | création (un projet naît toujours en phase commerciale) |
| Devis envoyé | `quoted` | automatique à l'envoi d'un devis lié, ou manuel |
| Négociation | `negotiation` | manuel |
| Devis accepté | `approved` | automatique à l'acceptation d'un devis lié ; **devis accepté requis** |
| En réalisation | `in_progress` | manuel ; **devis accepté requis** |
| Recette client | `testing` | manuel (PV de réception signé sur le portail) |
| Livré | `completed` | manuel ; alertes si tâches/jalons ouverts, PV non signé, reste à facturer |
| Maintenance / garantie | `maintenance` | manuel ; alerte si factures non encaissées |
| En pause / Perdu | `on_hold` / `cancelled` | à tout moment depuis une phase active |

Les garde-fous bloquants (devis accepté) peuvent être levés par un administrateur **avec un motif**,
tracé dans `statusHistory`. Les transitions passent par `POST /api/projects/[id]/workflow`
(le `PUT /api/projects` applique les mêmes règles).

Fiche projet admin (`/admin/projects/[id]`) :
- **pipeline** en tête de page : phases, passages autorisés, prochaines actions, résumé financier ;
- onglet **Tâches** : tableau Kanban (À faire → En cours → En revue → Terminé), glisser-déposer sur
  ordinateur, liste de colonnes sur mobile ; l'avancement du projet suit les tâches terminées ;
- onglet **Devis & factures** : devis et factures liés, liaison/déliaison, facturation totale,
  acompte (%) ou solde depuis un devis accepté.

## Règle des montants

- **Montant du projet = somme des devis acceptés liés** (net à payer). Il est recalculé à chaque
  écriture de devis, facture, paiement, avoir ; une saisie manuelle est remplacée dès qu'un devis est accepté.
- Facturé = factures émises (hors brouillon et annulées), avoirs déduits. La somme facturée sur un devis
  ne peut pas dépasser son montant (`/api/admin/invoices/from-quote` modes `full`, `deposit`, `balance`).
- Les écarts (projet ≠ devis acceptés, sur-facturation, facture sans devis) s'affichent sur la fiche projet.
- Lier un devis à un projet rattache aussi ses factures ; une facture créée depuis un devis hérite du projet.

## Migration de la base (une seule fois en production)

La collection `projects` porte un ancien validateur `$jsonSchema` (statut limité à
`pending|in_progress|completed|cancelled`, `value` en chaîne). Tant qu'il est en place, l'application
enregistre les phases au format historique et affiche « Base non migrée ».

Sur l'EC2, avec le compte **root** Mongo (collMod exige dbAdmin) :

```bash
cd ~/itvision
C="sudo docker compose --env-file .env.ec2 -f docker-compose.ec2.yml"
ROOTPW=$(grep '^MONGO_ROOT_PASSWORD=' .env.ec2 | cut -d= -f2-)
ROOT_URI="mongodb://admin:${ROOTPW}@mongodb:27017/itvision_db?authSource=admin&replicaSet=rs0"
$C run --rm --no-deps -e MONGODB_URI="$ROOT_URI" app node .ops/migrate-projects-workflow.cjs --dry-run
$C run --rm --no-deps -e MONGODB_URI="$ROOT_URI" app node .ops/migrate-projects-workflow.cjs --apply
```

La migration est idempotente : elle remplace le validateur puis normalise les projets
(`pending` → phase déduite des devis, `value` → nombre = devis acceptés).
Si le mot de passe root contient des caractères spéciaux (`@`, `:`, `/`), encodez-le dans l'URI.

## Documents

`/admin/documents` regroupe les pièces des projets (`Project.documents`) et les pièces jointes des devis
et factures (`attachments`) : recherche, filtres, aperçu PDF/image, partage client (documents projet),
dépôt par glisser-déposer puis classement dans un projet, un devis ou une facture.
Tous les envois de fichiers de l'application utilisent [`FileDropZone`](../src/components/ui/FileDropZone.tsx)
(glisser-déposer + clic).

## Proxy nginx (EC2)

nginx limite par défaut le corps des requêtes à **1 Mo**. Seule `location /api/upload` était relevée :
l'import de devis/factures PDF (`/api/admin/*/extract`) et l'envoi de documents (`/api/admin/documents/upload`)
échouaient au-delà de 1 Mo (erreur 413). Ajouter dans le bloc `server` HTTPS de `/etc/nginx/sites-enabled/itvision` :

```nginx
client_max_body_size 25m;
```

puis `sudo nginx -t && sudo systemctl reload nginx`.
