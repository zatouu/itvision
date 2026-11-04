# Configuration Apify pour l'import AliExpress

## 🚀 Guide de démarrage rapide

### 1. Créer un compte Apify

1. Allez sur [https://apify.com](https://apify.com)
2. Créez un compte (gratuit avec 5$ de crédit/mois)
3. Allez dans **Settings** → **Integrations** → **API tokens**
4. Copiez votre **Personal API token**

### 2. Configurer dans votre projet

Ajoutez dans votre fichier `.env` :

```env
APIFY_API_KEY=votre-token-apify
IMPORT_SOURCE=apify
```

### 3. Utiliser l'interface d'import

1. Accédez à `/admin/import-produits`
2. Utilisez la recherche par mot-clé
3. Les produits seront importés via Apify automatiquement

## 📊 Avantages d'Apify

- ✅ **Plus fiable** : Gestion automatique des proxies et CAPTCHAs
- ✅ **Meilleur prix** : ~0.10$ pour 1000 produits
- ✅ **Plan gratuit** : 5$ de crédit/mois (suffisant pour ~50k produits)
- ✅ **Maintenu** : Scrapers régulièrement mis à jour

## 🔧 Acteurs Apify disponibles

Par défaut, le système utilise `apify/aliexpress-scraper`. Vous pouvez changer l'actor dans `.env` :

```env
APIFY_ACTOR_ID=votre-actor-id
```

### Acteurs populaires pour AliExpress :

- `saswave/aliexpress-scraper` (par défaut)
- Recherchez d'autres actors sur [Apify Store](https://apify.com/store?q=aliexpress)

**⚠️ Important :** Les actors peuvent changer. Si vous obtenez une erreur 404, vérifiez que l'actor existe encore et mettez à jour `APIFY_ACTOR_ID` dans votre `.env`.

## ⚙️ Configuration avancée

### Changer l'actor

Si vous voulez utiliser un autre actor Apify, modifiez `src/lib/import-sources.ts` :

```typescript
const actorId = config.options?.actorId || 'votre-actor-id'
```

### Options personnalisées

Vous pouvez passer des options supplémentaires à l'actor :

```typescript
// Dans src/app/api/products/import/route.ts
const result = await importFromApify(keyword, limit, {
  source: 'apify',
  apiKey: apifyKey,
  options: {
    actorId: 'votre-actor-id',
    // Autres options spécifiques à l'actor
  }
})
```

## 🆘 Dépannage

### Erreur "APIFY_API_KEY est requis"

- Vérifiez que la clé est bien dans `.env`
- Redémarrez le serveur après modification de `.env`

### Erreur "Timeout: le run Apify prend trop de temps"

- L'actor peut prendre jusqu'à 2 minutes pour scraper
- Si le problème persiste, vérifiez que l'actor existe et fonctionne sur Apify

### Fallback sur RapidAPI

Si Apify échoue, le système bascule automatiquement sur RapidAPI (si configuré). Vous verrez un message dans les logs.

## 💰 Coûts

- **Plan gratuit** : 5$ de crédit/mois
- **Coût par produit** : ~0.0001$ (0.10$ pour 1000 produits)
- **Avec le plan gratuit** : ~50 000 produits/mois

## 📚 Documentation

- [Documentation Apify](https://docs.apify.com/)
- [Apify Store - AliExpress](https://apify.com/store?q=aliexpress)

