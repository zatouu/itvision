# Actors Apify pour AliExpress

## 🔍 Trouver un actor Apify

L'actor `apify/aliexpress-scraper` n'existe pas par défaut. Vous devez utiliser un actor communautaire.

### Actors disponibles

1. **saswave/aliexpress-scraper** (par défaut dans le code)
   - URL: https://apify.com/saswave/aliexpress-scraper
   - Vérifiez qu'il est toujours actif avant de l'utiliser

2. **Rechercher d'autres actors**
   - Allez sur https://apify.com/store
   - Recherchez "aliexpress" ou "alibaba"
   - Choisissez un actor avec de bonnes notes et récent

### Comment utiliser un actor personnalisé

Dans votre `.env` :

```env
APIFY_API_KEY=votre-token
APIFY_ACTOR_ID=username/actor-name
IMPORT_SOURCE=apify
```

Exemple :
```env
APIFY_ACTOR_ID=saswave/aliexpress-scraper
```

### Alternative : Créer votre propre actor

Si aucun actor ne fonctionne, vous pouvez :

1. Créer votre propre actor sur Apify
2. Utiliser le template de scraping web
3. Configurer pour scraper AliExpress
4. Utiliser l'ID de votre actor dans `APIFY_ACTOR_ID`

## ⚠️ Note importante

Les actors Apify peuvent changer ou être supprimés. Si vous obtenez une erreur 404 :

1. Vérifiez que l'actor existe encore sur Apify Store
2. Mettez à jour `APIFY_ACTOR_ID` avec un actor valide
3. Ou utilisez RapidAPI en fallback (déjà configuré)








