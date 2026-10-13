9999%# Solutions Import Taobao / 1688

## Problématique

Taobao et 1688 ont des protections anti-scraping avancées :
- CAPTCHA dynamique (slider, click verification)
- Blocage IP rapide après 3-5 requêtes
- Fingerprinting navigateur (User-Agent, WebGL, Canvas)
- Authentification requise pour les détails produits
- Rate limiting agressif

## Solutions recommandées

### Option 1 : Import Manuel Assisté (Recommandé - Stable)

Interface admin simplifiée où tu colles manuellement les informations.

**Avantages :**
- 100% fiable, pas de blocage
- Contrôle qualité immédiat
- Permet d'ajuster prix/images avant import

**Inconvénients :**
- Temps de saisie (~2 min par produit)
- Pas scalable pour 1000+ produits

**Implémentation existante :** `/admin/import-produits` avec mode "Import Manuel"

```typescript
// Interface de saisie rapide
interface ManualImportForm {
  productUrl: string      // URL Taobao/1688
  name: string
  price1688: number       // Prix en ¥ (copié depuis la page)
  images: string[]        // Upload ou URLs
  weightKg: number
  dimensions: { l: number, w: number, h: number }
}
```

---

### Option 2 : Apify avec Actor Spécialisé (Moyen)

Utiliser un actor Apify dédié pour scraping avancé.

**Avantages :**
- Contournement des protections via headless browsers
- Rotating proxies inclus
- Extraction complète (images, variantes, descriptions)

**Inconvénients :**
- Coût : ~$49/mois + crédits compute
- Temps d'exécution : 30-60s par produit
- Peut échouer si captcha complexe

**Actors recommandés :**
- `saswave/aliexpress-scraper` (testé, fonctionne)
- `dhrumil/taobao-scraper` (non testé, résultats variables)
- `yeyo/taobao-crawler` (expérimental)

**Configuration .env :**
```bash
APIFY_API_KEY=your_token_here
APIFY_ACTOR_ID=yeyo/taobao-crawler  # ou autre actor
IMPORT_SOURCE=apify
```

---

### Option 3 : API TBD (Taobao Business Development) (Long terme)

API officielle pour partenaires commerciaux.

**Avantages :**
- Accès stable et légal
- Données complètes et à jour
- Support technique

**Inconvénients :**
- Processus d'approbation long (2-3 mois)
- Nécessite entreprise enregistrée en Chine ou partenaire
- KYC strict

**Processus :**
1. Créer compte Alibaba Open Platform
2. Soumettre demande TBD (Taobao Business Development)
3. Fournir documents société
4. Intégrer SDK/API

**Non recommandé à court terme** (trop long à mettre en place)

---

### Option 4 : Services de Scraping Proxy (Alternative)

Services qui gèrent les proxies et CAPTCHA.

| Service | Prix | Fiabilité Taobao |
|---------|------|------------------|
| **ScrapingBee** | $49/mois | Moyenne |
| **ScraperAPI** | $49/mois | Moyenne |
| **Bright Data** | Pay-per-use | Haute (mais cher) |
| **Oxylabs** | $300/mois | Haute |

**Recommandation :** Tester ScrapingBee avec l'option `premium_proxy=true` et `render_js=true`

---

### Option 5 : Chrome Extension (Innovant)

Extension navigateur pour capturer les données pendant ta navigation.

**Fonctionnement :**
1. Tu navigues sur Taobao/1688
2. Clic sur l'extension quand tu vois un produit intéressant
3. L'extension extrait : nom, prix, images, URL
4. Envoie directement à ton API `/api/products/import`

**Avantages :**
- Contourne les protections (tu es un vrai utilisateur)
- Capture exactement ce que tu vois
- Rapide (1 clic)

**Inconvénients :**
- Développement extension nécessaire (~2 jours)
- Nécessite installation chez tous les admins

**Stack technique :**
- Manifest V3
- Content script pour extraction
- Background script pour appel API

---

### Option 6 : Focus sur 1688 uniquement (Pivot stratégique)

1688 est plus facile à scraper que Taobao pour plusieurs raisons :
- Moins de protection CAPTCHA
- Orienté B2B (bulk), pas B2C
- API plus accessible
- Mêmes fournisseurs que Taobao (souvent)

**Recommandation :**
- Désactiver l'import Taobao pour l'instant
- Focus sur 1688 avec parsing HTML actuel
- Utiliser Apify pour AliExpress (export vers particuliers)

---

## Plan d'action recommandé

### Phase 1 : Immédiat (Cette semaine)

1. **Améliorer l'import manuel**
   - Créer un formulaire "Quick Add" dans `/admin/import-produits`
   - Pré-remplir automatiquement les prix (10% service + 2.5% assurance)
   - Upload drag-and-drop images

2. **Afficher un message clair pour Taobao**
   ```typescript
   if (isTaobaoUrl(url)) {
     return {
       success: false,
       code: 'TAOBAO_NOT_SUPPORTED',
       message: 'Import Taobao automatique temporairement indisponible. ' +
                'Solutions : 1) Utilisez 1688.com (mêmes produits, meilleurs prix), ' +
                '2) Import manuel (coller nom + prix + images)'
     }
   }
   ```

### Phase 2 : Court terme (Ce mois)

3. **Tester Apify pour Taobao**
   - Créer compte Apify
   - Tester actor `dhrumil/taobao-scraper`
   - Intégrer dans `src/lib/import-sources.ts`

4. **Développer Chrome Extension (si volume important)**
   - MVP : capture nom + prix + URL
   - V2 : capture images + variantes

### Phase 3 : Long terme (3-6 mois)

5. **Postuler API TBD Taobao**
   - Préparer documents société
   - Contacter Alibaba Cloud partner team

---

## Implémentation technique

### 1. Détection et message utilisateur

Modifier `/src/app/api/products/import/route.ts` :

```typescript
function isTaobaoUrl(rawUrl: string): boolean {
  const url = safeUrl(rawUrl)
  if (!url) return false
  const host = url.hostname.toLowerCase()
  return host.endsWith('taobao.com') || host.endsWith('tmall.com')
}

// Dans le handler GET/POST :
if (isTaobaoUrl(rawUrl)) {
  return NextResponse.json({
    success: false,
    code: 'TAOBAO_NOT_SUPPORTED',
    error: 'Import automatique Taobao indisponible. ' +
           'Solutions alternatives : ' +
           '1) Utiliser 1688.com (mêmes produits en B2B), ' +
           '2) Import manuel via le formulaire ci-dessous',
    alternatives: ['1688', 'manual']
  }, { status: 400 })
}
```

### 2. Formulaire import manuel rapide

Créer composant `QuickManualImport.tsx` :

```typescript
interface QuickImportData {
  platform: '1688' | 'taobao'
  productUrl: string
  name: string
  price1688: number
  images: string[]
  weightKg: number
  dimensions: {
    lengthCm: number
    widthCm: number
    heightCm: number
  }
}

// Calcul auto du prix de vente
const calculatePrice = (data: QuickImportData) => {
  const exchangeRate = 100  // 1¥ = 100 FCFA
  const productCost = data.price1688 * exchangeRate
  const serviceFee = productCost * 0.10
  const insurance = productCost * 0.025
  
  return {
    productCost,
    serviceFee,
    insurance,
    totalProduct: productCost + serviceFee + insurance,
    // Transport calculé séparément selon méthode
  }
}
```

### 3. Utiliser 1688 comme fallback

Quand Taobao bloque, suggérer la recherche équivalente sur 1688 :

```typescript
// Extraire le nom du produit depuis l'URL Taobao
// Construire URL de recherche 1688
const fallback1688Url = `https://s.1688.com/search/offer_search.htm?keywords=${encodeURIComponent(productName)}`
```

---

## Conclusion

**Recommandation immédiate :** Désactiver l'import Taobao automatique et proposer :
1. **1688** pour l'import automatique (fonctionne bien avec parsing HTML)
2. **Import manuel assisté** pour Taobao (formulaire rapide)
3. **Apify** comme alternative technique si volume important

**Ne pas investir dans :**
- Scraping direct Taobao (trop de blocages)
- Contournement CAPTCHA (risque légal et technique)

1688 est la meilleure alternative car :
- Même catalogue (fournisseurs identiques)
- Prix plus bas (B2B vs B2C)
- Moins de protections anti-bot
- Orienté export/international
