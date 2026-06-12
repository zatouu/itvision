# Images placeholders pour la page d'accueil marketplace

Ce dossier doit contenir les images suivantes pour remplacer les placeholders gradients :

- `hero-products.jpg` — Collage de produits tech (caméras IP, switches réseau, etc.)
- `feature-search.jpg` — Smartphone scannant un produit (recherche par photo)
- `feature-group.jpg` — Groupe d'acheteurs ou containers de marchandises
- `feature-sourcing.jpg` — Container ou usine chinoise
- `category-video.jpg` — Image de fond pour catégorie Vidéosurveillance
- `category-access.jpg` — Image de fond pour catégorie Contrôle d'accès
- `category-network.jpg` — Image de fond pour catégorie Réseau
- `category-domotique.jpg` — Image de fond pour catégorie Domotique

Actuellement, les composants utilisent des divs avec des gradients colorés comme placeholders. Pour utiliser de vraies images, remplacez les blocs `<div className="bg-gradient-to-br..." />` par des `<Image src="/images/home/xxx.jpg" ... />` dans les composants concernés.
