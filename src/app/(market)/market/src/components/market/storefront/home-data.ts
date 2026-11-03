// Mapping des réponses API de l'accueil DDM+ — partagé par le rendu serveur (SEO) et le client.
import { resolveSlideTheme, sanitizeSlideImages, sanitizeSlideLink } from '@/lib/market/promo-slides';
import type { HeroSlide } from './PromoSlideView';
import { mapCatalogItem, mapGroupOrder, mapCategory } from './data-mappers';
import type { Product, Group, Category } from './types';

export type HomeCategory = Category & { image?: string; count?: number };
export type GroupStats = { totalParticipants: number; totalSaved: number; totalFilled: number };

export type HomeData = {
  products: Product[];
  deals: Product[];
  recent: Product[];
  groups: Group[];
  categories: HomeCategory[];
  adminSlides: HeroSlide[];
  groupStats: GroupStats | null;
  failures: string[];
};

export type HomeApiResults = {
  productData: any;
  groupData: any;
  categoryData: any;
  slideData: any;
  dealData: any;
  recentData?: any;
  statsData: any;
};

export function mapAdminSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(slide => slide && typeof slide.title === 'string' && slide.title.trim())
    .map(slide => ({
      id: String(slide._id),
      title: slide.title,
      subtitle: slide.subtitle || undefined,
      badge: slide.badge || undefined,
      ctaText: slide.ctaText || 'Découvrir',
      ctaLink: sanitizeSlideLink(slide.ctaLink) ?? '/produits',
      theme: resolveSlideTheme(slide.bgColor),
      images: sanitizeSlideImages(slide.images),
    }));
}

export function mapHomeResults({ productData, groupData, categoryData, slideData, dealData, recentData, statsData }: HomeApiResults): HomeData {
  const failures: string[] = [];
  const productItems = productData?.products ?? productData?.items;
  const categoryItems = categoryData?.categories ?? categoryData?.items;
  const dealItems = dealData?.products ?? dealData?.items;
  const recentItems = recentData?.products ?? recentData?.items;
  if (!Array.isArray(productItems)) failures.push('Produits');
  if (!Array.isArray(groupData?.groups)) failures.push('Groupes');
  if (!Array.isArray(categoryItems)) failures.push('Catégories');
  const stats = statsData?.stats;
  return {
    products: Array.isArray(productItems) ? productItems.map(mapCatalogItem) : [],
    deals: Array.isArray(dealItems) ? dealItems.map(mapCatalogItem).filter((product: Product) => (product.save ?? 0) > 0).slice(0, 10) : [],
    recent: Array.isArray(recentItems) ? recentItems.map(mapCatalogItem) : [],
    groups: Array.isArray(groupData?.groups) ? groupData.groups.map(mapGroupOrder) : [],
    categories: Array.isArray(categoryItems) ? categoryItems.map((item: any) => ({
      ...mapCategory(item), image: item.image, count: item.count,
    })) : [],
    adminSlides: mapAdminSlides(slideData?.slides),
    groupStats: stats ? {
      totalParticipants: Number(stats.totalParticipants) || 0,
      totalSaved: Number(stats.totalSaved) || 0,
      totalFilled: Number(stats.totalFilled) || 0,
    } : null,
    failures,
  };
}
