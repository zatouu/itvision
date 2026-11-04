## Import Catalogue AliExpress

Ce script facilite la création de fiches produits “commande Chine” dans MongoDB à partir de la recherche AliExpress. Il s’appuie sur l’API RapidAPI *aliexpress-datahub* (end-point `item_search`).

### Prérequis

1. Créer un compte sur [RapidAPI](https://rapidapi.com/).
2. Souscrire à l’API **AliExpress DataHub** (ou une API équivalente qui expose `item_search`).
3. Récupérer la clé dans votre dashboard RapidAPI.
4. Ajouter les variables d’environnement côté serveur / `.env.local` :

```bash
ALIEXPRESS_RAPIDAPI_KEY=xxx
# Optionnel :
ALIEXPRESS_USD_TO_XOF=620         # taux de conversion USD -> FCFA
ALIEXPRESS_DEFAULT_MARGIN=30      # marge (%) appliquée par défaut
```

### Commande de base

```bash
npm run import:aliexpress -- --keyword "caméra hikvision" --limit 20 --dry-run --verbose
```

### Options CLI

| Option         | Description                                                                                 | Défaut |
|----------------|---------------------------------------------------------------------------------------------|--------|
| `--keyword`    | Terme de recherche envoyé à l’API AliExpress (ex. marque, référence, catégorie).           | `hikvision` |
| `--limit`      | Nombre total maximal de résultats traités (toutes pages confondues).                        | `10`   |
| `--page-size`  | Nombre d’éléments récupérés par requête API.                                                | `20`   |
| `--dry-run`    | Affiche les fiches sans les enregistrer (prévisualisation).                                 | `false` |
| `--verbose`    | Affiche les produits créés/mis à jour et les éléments ignorés (debug).                      | `false` |

> ⚠️ AliExpress impose des limites de quota par clé RapidAPI. Ajustez `--limit` et `--page-size` pour rester dans votre plan.

### Que fait le script ?

1. **Recherche AliExpress** : appels à `item_search` triés par prix (`sort=orignalPriceDown`).
2. **Normalisation** :
   - Conversion prix USD → FCFA (taux configuré, valeur minimale `baseCost`).
   - Calcul du prix public (`baseCost × (1 + marge%)`).
   - Estimation poids (minimum 1 kg si la donnée est absente).
   - Collecte d’attributs (`product_properties`, commandes, avis) pour remplir les “features”.
3. **Sourcing** : enregistre `platform=aliexpress`, boutique, URL produit, ID, nombre de commandes.
4. **Logistique** :
   - Stock `preorder`, `leadTimeDays=15`, message “Commande import Chine (freight 3j / 15j / 60j)”.
   - Le calcul transport final est réalisé côté front via `computeProductPricing` (air 3j, air 15j, mer 60j).
5. **Persistance** :
   - Si `--dry-run` → simple preview dans la console.
   - Sinon → `Product.create` pour une nouvelle fiche ou `updateOne` si l’URL fournisseur existe déjà.

### Workflow conseillé

1. **Exploration** : lancer plusieurs `--dry-run` avec différents mots-clés (marques, familles produit).
2. **Validation** : retirer `--dry-run` pour créer les fiches qui vous intéressent réellement.
3. **Curation** : se rendre dans `/admin/produits` pour ajuster :
   - Marges spécifiques.
   - Dimensions et volume (pour un calcul freight précis).
   - Overrides transport (`ratePerKg`, etc.) si certains produits dérogent à la grille standard.
   - Éventuelles traductions ou descriptions marketing personnalisées.
4. **Publication** : laisser `isPublished=true` pour exposer la fiche sur le site (`/produits`).

### Limites & bonnes pratiques

- **Qualité des images** : le script stocke l’URL principale AliExpress. Pour une meilleure expérience, téléchargez et uploadez ensuite des visuels HD dans votre propre CDN/S3.
- **Traductions** : AliExpress renvoie souvent des titres EN. Utiliser un outil (DeepL/API) si vous souhaitez franciser les `tagline`/`description`.
- **1688** : les prix y sont plus bas mais l’API publique est limitée. Ce script AliExpress sert de base (images HD, specs). Vous pouvez ensuite :
  - Remplacer `baseCost` manuellement par votre prix 1688 réel.
  - Compléter la fiche avec vos contacts/conditions de sourcing.
- **Quotas & coûts** : surveillez votre plan RapidAPI. L’utilisation intensive nécessite parfois un upgrade.

### Personnalisation

Le script est volontairement simple. Vous pouvez :
- Brancher une autre API en remplaçant `fetchAliExpress`.
- Ajouter un mapping catégories → services internes.
- Injecter automatiquement des overrides transport spécifiques (ex. volumineux → maritime obligatoire).

### Dépannage

- `ALIEXPRESS_RAPIDAPI_KEY est requis` : clé manquante, vérifier `.env` ou export dans la commande.
- `Quota exceeded` : vous avez dépassé votre limite RapidAPI → réduire `--limit` ou attendre le reset quotidien.
- Doublons : le script détecte l’URL fournisseur. Si vous devez gérer plusieurs vendeurs identiques, changez la clé de recherche (ex. `product_id`).

N’hésitez pas à enrichir le script selon vos besoins (support 1688 via scraping contrôlé, download d’images en local, etc.).

