# Transfert GitHub par petits lots

Source : C:/Users/o.ndiaye/Documents/VIT/itvision
Branche : feature/barakalah
Commit : b6c840685edb1acae4632b4605a75b13c0e77f2e

1949 fichiers, 54.63 Mo au total, repartis dans 20 lots.
Chaque lot contient au maximum 100 fichiers et 19 000 000 octets, strictement moins de 20 Mo.
Les fichiers sont copies sans modification et verifies par SHA-256. Le depot source est conserve intact.

## Televersement

1. Ouvrir le depot GitHub et choisir la branche de destination, normalement feature/barakalah.
2. Revenir a la RACINE du depot, puis Add file > Upload files.
3. Ouvrir lot-01 dans l'Explorateur et glisser son CONTENU (fichiers et sous-dossiers). Ne pas glisser le dossier lot-01 lui-meme.
4. Conserver tous les chemins, y compris .github et les fichiers dont le nom commence par un point. Ne pas creer de dossier itvision supplementaire.
5. Valider avec un message comme 'Transfert lot 01 [skip ci]' pour eviter les builds sur une copie incomplete.
6. Repeter pour chaque lot, toujours depuis la racine du depot et sur la meme branche.
7. Apres le dernier lot, lancer manuellement le workflow depuis Actions sur cette branche, sans cocher le deploiement EC2.

Ne pas televerser ce guide ni MANIFESTE.json : ce sont des documents de transfert, pas des sources applicatives.
Un ZIP glisse sur GitHub reste une archive ; ces lots contiennent donc directement les sources.
Ce transfert ne transporte ni l'historique Git, ni les secrets, ni les suppressions de fichiers deja presents sur GitHub.
Sur une autre machine, copier successivement le contenu de tous les lots dans un meme dossier reconstitue les sources retenues.

## Lots

| Lot | Fichiers | Mo (decimaux) |
| --- | ---: | ---: |
| lot-01 | 100 | 8.94 |
| lot-02 | 100 | 10.03 |
| lot-03 | 100 | 3.67 |
| lot-04 | 100 | 2.60 |
| lot-05 | 100 | 1.28 |
| lot-06 | 100 | 11.00 |
| lot-07 | 100 | 7.00 |
| lot-08 | 100 | 1.12 |
| lot-09 | 100 | 0.62 |
| lot-10 | 100 | 0.47 |
| lot-11 | 100 | 0.52 |
| lot-12 | 100 | 0.52 |
| lot-13 | 100 | 1.61 |
| lot-14 | 100 | 1.17 |
| lot-15 | 100 | 0.97 |
| lot-16 | 100 | 0.60 |
| lot-17 | 100 | 0.50 |
| lot-18 | 100 | 0.38 |
| lot-19 | 100 | 1.28 |
| lot-20 | 49 | 0.36 |

## Exclusions

65 fichiers suivis ou nouveaux ont ete exclus : outils temporaires, sorties generees, sauvegardes, archives et configurations privees detectees.
Les fichiers ignores par Git (.git, dependances, caches, .env locaux, etc.) ne sont pas candidats au transfert.
Les modeles .env.example sont conserves lorsqu'aucun motif de secret connu n'est detecte.
La liste exacte et les raisons figurent dans MANIFESTE.json. Ce filtrage ne remplace pas un audit complet des secrets.
