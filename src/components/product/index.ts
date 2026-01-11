// ============================================================================
// COMPOSANTS PRODUIT - INDEX
// ============================================================================
// 
// Point d'entrée unique pour tous les composants liés à l'affichage produit.
// Ces composants sont conçus pour être modulaires et réutilisables.
//
// Architecture:
// - ProductGallery: Galerie d'images avec zoom, swipe mobile, modal plein écran
// - ProductGalleryImmersive: Galerie avancée avec support vidéo et recherche image
// - ProductPriceBlock: Affichage structuré des prix (source, frais, paliers)
// - ProductInfoTabs: Onglets d'information (description, features, etc.)
// - ProductTabsImmersive: Onglets enrichis style 1688 (description, specs, usage, reviews)
// - ProductRichDescription: Rendu enrichi du contenu HTML de description
// - ProductRichContent: Contenu riche avec features, specs, scenarios
// - ProductReviewsWithMedia: Avis clients avec upload médias (style AliExpress)
//
// Usage:
// ```tsx
// import { 
//   ProductGalleryImmersive, 
//   ProductTabsImmersive, 
//   ProductReviewsWithMedia 
// } from '@/components/product'
// ```
// ============================================================================

// Galerie d'images (version basique)
export { default as ProductGallery } from './ProductGallery'
export type { ProductGalleryProps } from './ProductGallery'

// Galerie immersive avec vidéo et recherche image (style 1688)
export { default as ProductGalleryImmersive } from './ProductGalleryImmersive'
export type { ProductGalleryImmersiveProps, MediaItem } from './ProductGalleryImmersive'

// Bloc de prix structuré
export { default as ProductPriceBlock } from './ProductPriceBlock'
export type { 
  ProductPriceBlockProps, 
  PriceTier, 
  PricingFees 
} from './ProductPriceBlock'

// Onglets d'information (version basique)
export { default as ProductInfoTabs } from './ProductInfoTabs'
export type { 
  ProductInfoTabsProps, 
  InfoTabId, 
  LogisticsEntry, 
  Review as InfoTabReview 
} from './ProductInfoTabs'

// Onglets immersifs style 1688 (description, specs, usage, reviews)
export { default as ProductTabsImmersive } from './ProductTabsImmersive'
export type { ProductTabsImmersiveProps, ProductTabId } from './ProductTabsImmersive'

// Rendu de description enrichie
export { default as ProductRichDescription } from './ProductRichDescription'
export type { ProductRichDescriptionProps } from './ProductRichDescription'

// Contenu riche (features, specs, scenarios)
export { default as ProductRichContent } from './ProductRichContent'
export type { 
  ProductRichContentProps,
  RichContentBlock,
  FeatureHighlight,
  SpecGroup,
  UsageScenario
} from './ProductRichContent'

// Avis clients avec médias (style AliExpress)
export { default as ProductReviewsWithMedia } from './ProductReviewsWithMedia'
export type { 
  ProductReviewsWithMediaProps,
  Review as MediaReview,
  ReviewMedia,
  NewReviewData
} from './ProductReviewsWithMedia'

// Panel de prix sticky (pour layout Alibaba)
export { default as ProductPricingPanel } from './ProductPricingPanel'
export type { ProductPricingPanelProps } from './ProductPricingPanel'

// Layout Alibaba (colonne gauche scrollable, droite sticky)
export { default as ProductLayoutAlibaba } from './ProductLayoutAlibaba'
