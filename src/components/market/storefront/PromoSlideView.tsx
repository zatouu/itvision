'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Sparkles, Truck, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SLIDE_THEMES, SOURCING_LINK, sanitizeSlideLink, type SlideThemeKey } from '@/lib/market/promo-slides';

export type SlideArt = 'camera' | 'users' | 'truck' | 'sparkles';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText: string;
  ctaLink: string;
  theme: SlideThemeKey;
  images: string[];
  /** Illustration quand le slide n'a pas d'image */
  art?: SlideArt;
}

const ART: Record<SlideArt, LucideIcon> = { camera: Camera, users: Users, truck: Truck, sparkles: Sparkles };

export interface PromoSlideViewProps {
  slide: HeroSlide;
  onSourcing?: () => void;
  /** Aperçu admin : le bouton ne navigue pas */
  preview?: boolean;
  /** Premier slide : images chargées immédiatement */
  eager?: boolean;
}

export function PromoSlideView({ slide, onSourcing, preview = false, eager = false }: PromoSlideViewProps) {
  const theme = SLIDE_THEMES[slide.theme] ?? SLIDE_THEMES.emerald;
  const link = sanitizeSlideLink(slide.ctaLink) ?? '/produits';
  const images = slide.images.filter(Boolean);
  const ArtIcon = ART[slide.art ?? 'sparkles'];
  const ctaClass = cn(
    'mt-3 inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 @xl:px-5',
    theme.darkText ? 'bg-zinc-950 text-white focus-visible:outline-zinc-950' : 'bg-white text-zinc-900 focus-visible:outline-white',
  );
  const ctaContent = <>{slide.ctaText || 'Découvrir'}<ArrowRight size={16} aria-hidden /></>;

  let cta: ReactNode;
  if (preview) cta = <span className={ctaClass}>{ctaContent}</span>;
  else if (link === SOURCING_LINK) cta = <button type="button" onClick={() => onSourcing?.()} className={ctaClass}>{ctaContent}</button>;
  else if (link.startsWith('https://')) cta = <a href={link} target="_blank" rel="noopener noreferrer" className={ctaClass}>{ctaContent}</a>;
  else cta = <Link href={link} className={ctaClass}>{ctaContent}</Link>;

  return (
    // Mise en page selon la largeur du slide (requêtes de conteneur) : identique dans le carrousel et dans l'aperçu admin
    <div className="@container h-full">
    <div className={cn('relative isolate flex h-full min-h-[196px] overflow-hidden rounded-2xl p-5 @xl:min-h-[250px] @xl:p-8 @2xl:px-16 @4xl:min-h-[300px] @4xl:px-20', theme.bg, theme.darkText ? 'text-zinc-950' : 'text-white')}>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-black/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute bottom-4 right-1/3 hidden h-3 w-3 rounded-full bg-white/50 @xl:block" />
      <span aria-hidden className="pointer-events-none absolute right-6 top-6 hidden h-2 w-2 rounded-full bg-white/60 @xl:block" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center pr-3 @xl:pr-6">
        {slide.badge && (
          <span className={cn('mb-2 w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', theme.darkText ? 'bg-zinc-950/10' : 'bg-white/20')}>
            {slide.badge}
          </span>
        )}
        <h2 className="line-clamp-3 text-xl font-extrabold leading-tight [overflow-wrap:anywhere] @xl:text-3xl @4xl:text-4xl">{slide.title}</h2>
        {slide.subtitle && <p className={cn('mt-1.5 line-clamp-2 max-w-xl text-sm @xl:line-clamp-3 @xl:text-base', theme.darkText ? 'text-zinc-800' : 'text-white/90')}>{slide.subtitle}</p>}
        {cta}
      </div>

      <div aria-hidden className="relative z-0 hidden w-[32%] shrink-0 items-center justify-center @[18rem]:flex @xl:w-[38%]">
        {images.length > 0 ? (
          <div className="relative h-28 w-28 @xl:h-44 @xl:w-44 @4xl:h-56 @4xl:w-56">
            {images[1] && (
              <img src={images[1]} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async"
                className="absolute -left-10 bottom-0 hidden h-24 w-24 -rotate-6 rounded-xl bg-white object-contain p-1 shadow-xl @xl:block @4xl:h-28 @4xl:w-28" />
            )}
            {images[2] && (
              <img src={images[2]} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async"
                className="absolute -right-6 -top-4 hidden h-24 w-24 rotate-12 rounded-xl bg-white object-contain p-1 shadow-xl @4xl:block" />
            )}
            <img src={images[0]} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async"
              className="relative h-full w-full rotate-3 rounded-2xl bg-white object-contain p-1.5 shadow-2xl" />
          </div>
        ) : (
          <span className={cn('grid h-24 w-24 place-items-center rounded-full ring-8 @xl:h-36 @xl:w-36 @4xl:h-44 @4xl:w-44', theme.darkText ? 'bg-zinc-950/10 ring-zinc-950/5' : 'bg-white/15 ring-white/10')}>
            <ArtIcon className="h-11 w-11 @xl:h-16 @xl:w-16 @4xl:h-20 @4xl:w-20" strokeWidth={1.6} />
          </span>
        )}
      </div>
    </div>
    </div>
  );
}
