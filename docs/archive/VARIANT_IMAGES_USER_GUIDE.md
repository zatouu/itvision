# 🖼️ Guide Pratique: Utilisation des Images de Variantes

## Pour les Administrateurs

### Ajouter une image à une variante

1. **Accéder au gestionnaire de produits**
   - Aller à `/admin/produits` ou menu Admin → Produits

2. **Éditer un produit existant**
   - Cliquer sur le produit à modifier
   - Scroller jusqu'à la section "Variantes"

3. **Trouver le groupe de variantes**
   - Localiser le groupe (ex: "Taille", "Couleur")
   - Voir la liste des variantes

4. **Uploader une image pour une variante**
   ```
   Groupe "Taille"
   ├─ Variante S
   │  ├─ Nom: Small
   │  ├─ Prix: 45¥ = 28000 FCFA
   │  ├─ Stock: 100
   │  └─ Image: [________] [Uploader] [preview]  ← Cliquer ici
   │             URL          Bouton
   ```

5. **Sélectionner le fichier**
   - Cliquer bouton "Uploader"
   - Sélectionner image sur votre PC (JPG, PNG, WebP, GIF)
   - Max 5 MB

6. **Vérifier le succès**
   - ✅ Alerte "Image uploadée avec succès!"
   - ✅ Miniature apparaît à droite du bouton
   - ✅ Champ "Image" rempli avec URL

7. **Sauvegarder le produit**
   - Scroller bas de la page
   - Cliquer "Sauvegarder produit"

### Utiliser une URL d'image directe (optionnel)

Si l'image est déjà en ligne:
```
1. Copier l'URL complète: https://example.com/image.jpg
2. Coller dans le champ "Image" de la variante
3. Sauvegarder
```

### Importer depuis le catalogue 1688

```
1. Produit importé d'Alibaba/1688 avec variantes?
2. Essayer d'uploader de nouvelles images pour améliorer présentation
3. Les variantes sans image utiliseront l'image produit par défaut
```

### Gestion de plusieurs variantes

**Groupe "Taille" avec 3 images:**
```
Groupe "Taille"
├─ S: [preview_s.jpg] ✓
├─ M: [preview_m.jpg] ✓
└─ L: [vide]          (utilisera image produit)
```

**Résultat pour client:**
- Clique S → Galerie affiche image S
- Clique M → Galerie affiche image M
- Clique L → Galerie affiche image produit

---

## Pour les Clients (Expérience d'achat)

### Voir les images de variantes

1. **Ouvrir un produit avec variantes**
   - Aller à `/produits/[id]`
   - Voir galerie images

2. **Sélectionner une variante**
   ```
   Page produit:
   
   [GALERIE IMAGE]
   Images: 1  2  3  4  ← Miniatures
   
   [SÉLECTEUR VARIANTES]
   Taille:  S  M  L
   ```

3. **Galerie se met à jour automatiquement**
   - Cliquer "S" → Galerie affiche image S
   - Cliquer "M" → Galerie affiche image M
   - Cliquer "L" → Galerie affiche image produit

4. **Consulter les détails**
   - Image variante remplace le premier cadre
   - Prix mis à jour si variante plus chère
   - Stock mis à jour si variante

5. **Ajouter au panier**
   - Quantité sélectionnée
   - Cliquer "Acheter" ou "Panier"
   - Variante conservée dans le panier

---

## Cas d'Usage Pratiques

### Cas 1: T-shirt avec tailles et couleurs

```
Admin:
├─ Groupe "Taille": S, M, L, XL
├─ Groupe "Couleur": Rouge, Bleu, Noir
├─ Uploader image pour chaque combo pertinent
│  └─ S-Rouge: image_s_red.jpg
│  └─ M-Red: image_m_red.jpg
│  └─ L-Blue: image_l_blue.jpg
└─ Sauvegarder

Client:
Voir produit
Cliquer S → affiche image S-Red
Cliquer Bleu → affiche image M-Bleu (ou image produit si pas d'image)
Ajouter au panier avec sélection finale
```

### Cas 2: Produit importé sans images variantes

```
Admin:
├─ Produit d'Alibaba: T-shirt
├─ Variantes: S, M, L
├─ Image produit générale: product_tshirt.jpg
├─ Variantes sans images (champ vide)
└─ Sauvegarder

Client:
Voir produit
Cliquer S → affiche toujours product_tshirt.jpg
Cliquer M → affiche toujours product_tshirt.jpg
(Pas d'erreur, comportement attendu)
```

### Cas 3: Mise à jour image variante

```
Admin:
1. Produit déjà publié avec images S, M
2. Vouloir changer image S
3. Cliquer "Uploader" sur variante S
4. Sélectionner nouvelle image
5. Alerte de succès
6. Sauvegarder produit
7. CLIENT: Recharger page → Nouvelle image affichée

✓ Ancien lien: /api/uploads/variants/old-uuid.jpg (remplacé)
✓ Nouveau lien: /api/uploads/variants/new-uuid.jpg (stocké)
✓ Pas de duplication, pas de fichier orphelin
```

---

## Troubleshooting

### ❌ "Erreur lors de l'upload"

**Cause possible 1: Fichier trop volumineux**
- Limite: 5 MB
- Solution: Compresser image avant upload

**Cause possible 2: Type de fichier non autorisé**
- Formats acceptés: JPG, PNG, WebP, GIF
- Solution: Convertir en format supporté

**Cause possible 3: Non authentifié**
- Vérifier: Connecté en tant qu'admin?
- Solution: Se déconnecter / reconnecter

### ❌ "Image uploadée mais ne s'affiche pas"

**Cause possible 1: Pas de rafraîchissement**
- Solution: Appuyer F5 ou recharger page

**Cause possible 2: Image variante pas sélectionnée en défaut**
- Galerie affiche image sélectionnée
- Solution: Cliquer sur la variante pour voir son image

**Cause possible 3: URL malformée**
- Vérifier: Champ image contient URL valide?
- Solution: Réuploader avec bouton "Uploader"

### ❌ Galerie vide après upload

**Debug steps:**
1. Ouvrir browser DevTools (F12)
2. Aller à Network tab
3. Uploader image
4. Voir réponse: `{ success: true, url: "..." }`?
5. Si oui: Recharger page avec Ctrl+Shift+R (cache)
6. Si non: Vérifier erreur API

---

## Performance & Optimisation

### Recommandations

| Aspect | Recommandation | Raison |
|--------|---|---|
| **Taille image** | 100-300 KB | Chargement rapide galerie |
| **Format** | WebP > PNG > JPG | Compression optimale |
| **Dimensions** | 500×500 px min | Qualité convenable |
| **Nombre variantes** | < 10 par groupe | Performance galerie |

### Exemple optimisation

```bash
# Avant: large-image.jpg (2.5 MB)
ffmpeg -i large-image.jpg -q:v 2 optimized.jpg  # 200-300 KB

# Convertir en WebP pour web
cwebp optimized.jpg -o optimized.webp  # ~100 KB
```

---

## Limites et Contraintes

| Aspect | Limite | Notes |
|--------|--------|-------|
| Taille fichier | 5 MB | Configurable dans `/api/upload/route.ts` |
| Formats | JPG, PNG, WebP, GIF | Autres formats rejetés |
| Upload/heure | 10 par utilisateur | Rate limiting actif |
| Stockage | Disque serveur | Prévoir espace `/public/uploads/` |
| Durée de vie | Permanente | Jusqu'à suppression manuelle |

---

## Architecture Technique (Résumé)

```
Client Browser
    │
    ├─ Voir produit avec variantes
    │
    ├─ Sélectionner variante
    │
    └─ ProductDetailExperience.tsx
        └─ useMemo calcule galerie dynamique
            └─ Affiche image variante #1
```

```
Admin Panel
    │
    ├─ Éditer produit → Variante
    │
    ├─ Cliquer "Uploader"
    │
    └─ FormData (file) → /api/upload
        └─ POST (file) → /uploads/variants/[uuid].jpg
            └─ Retourner URL: /api/uploads/variants/[uuid].jpg
                └─ Stocker en BD
                    └─ Afficher preview
```

---

## FAQ

**Q: Combien d'images par variante?**
A: 1 image par variante. Si besoin plusieurs angles, utiliser galerie produit.

**Q: Peut changer image après publication?**
A: Oui! Réuploader remplace l'image. Clients verront nouvelle image après refresh.

**Q: Variante sans image, qu'est-ce qui s'affiche?**
A: Image produit principal. Pas d'erreur, pas de blanc.

**Q: Image URL directe vs upload, différence?**
A: Aucune! Les deux stockent URL. Upload juste sauvegarde fichier localement.

**Q: Supprimer image variante?**
A: Effacer URL du champ "Image" et sauvegarder.

**Q: Limitation nombre fichiers?**
A: Pas de limite nombre, sauf espace disque serveur.

**Q: Réutiliser même image multiple variantes?**
A: Oui! Copier/coller URL ou uploader une fois puis copier URL.

**Q: Image variante dans panier?**
A: Oui! Panier affiche image variante si disponible.

---

## Support

**Problème upload?**
- Vérifier taille (< 5 MB)
- Vérifier format (JPG, PNG, WebP, GIF)
- Vérifier connexion (admin authentifié)
- Vérifier espace disque serveur

**Image ne s'affiche pas?**
- Recharger page (F5 ou Ctrl+Shift+R)
- Vérifier sélection variante (image sélectionnée?)
- Vérifier URL image (champ rempli?)
- Ouvrir console (F12) voir erreurs

**Besoin aide?**
- Consulter [VARIANT_IMAGES_MANAGEMENT.md](./VARIANT_IMAGES_MANAGEMENT.md)
- Vérifier tests: [__tests__/variant-gallery.test.ts](./__tests__/variant-gallery.test.ts)

---

**Status**: ✅ Production Ready  
**Version**: 1.0  
**Last Updated**: Janvier 2025

