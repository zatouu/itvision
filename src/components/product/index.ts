// ============================================================================
// COMPOSANTS PRODUIT - INDEX
// ============================================================================
// 
// Point d'entrée unique pour tous les composants liés à l'affichage produit.
// Ces composants sont conçus pour être modulaires et réutilisables.
//
// Architecture:
// - ProductGallery: Galerie d'images avec zoom, swipe mobile, modal plein écran
// - ProductPriceBlock: Affichage structuré des prix (source, frais, paliers)
// - ProductInfoTabs: Onglets d'information (description, features, etc.)
// - ProductRichDescription: Rendu enrichi du contenu HTML de description
// - ProductGroupBuyBlock: Bloc d'achat groupé (voir GroupBuyProposalModal)
//
// Usage:
// ```tsx
// import { ProductGallery, ProductPriceBlock, ProductInfoTabs } from '@/components/product'
// ```
// ============================================================================

// Galerie d'images
export { default as ProductGallery } from './ProductGallery'
export type { ProductGalleryProps } from './ProductGallery'

// Bloc de prix structuré
export { default as ProductPriceBlock } from './ProductPriceBlock'
export type { 
  ProductPriceBlockProps, 
  PriceTier, 
  PricingFees 
} from './ProductPriceBlock'

// Onglets d'information
export { default as ProductInfoTabs } from './ProductInfoTabs'
export type { 
  ProductInfoTabsProps, 
  InfoTabId, 
  LogisticsEntry, 
  Review 
} from './ProductInfoTabs'

// Rendu de description enrichie
export { default as ProductRichDescription } from './ProductRichDescription'
export type { ProductRichDescriptionProps } from './ProductRichDescription'
