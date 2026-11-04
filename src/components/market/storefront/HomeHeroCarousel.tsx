'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromoSlideView, type HeroSlide } from './PromoSlideView';

const AUTOPLAY_MS = 6000;

export interface HomeHeroCarouselProps {
  slides: HeroSlide[];
  onSourcing?: () => void;
}

/** Carrousel à défilement natif (glisser au doigt) avec lecture auto, pausée au survol, au toucher et hors écran. */
export function HomeHeroCarousel({ slides, onSourcing }: HomeHeroCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const resumeTimer = useRef<number | undefined>(undefined);
  const count = slides.length;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Slide actif = celui majoritairement visible dans la piste
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index) || 0);
      }
    }, { root: track, threshold: 0.6 });
    Array.from(track.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((index: number, smooth = true) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    track.scrollTo({ left: slide.offsetLeft - padding, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
  }, [reducedMotion]);

  const pauseFor = useCallback((ms: number) => {
    setPaused(true);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    if (count < 2 || paused || !visible || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') goTo((active + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [active, count, paused, visible, reducedMotion, goTo]);

  if (count === 0) return null;

  const navigate = (index: number) => {
    pauseFor(12000);
    goTo((index + count) % count);
  };

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="À la une"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => pauseFor(10000)}
    >
      <div
        ref={trackRef}
        className="scrollbar-hide relative flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 sm:scroll-px-0 sm:px-0"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            data-index={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} sur ${count}`}
            aria-hidden={count > 1 && index !== active ? true : undefined}
            inert={count > 1 && index !== active ? true : undefined}
            className="w-full shrink-0 snap-start"
          >
            <PromoSlideView slide={slide} onSourcing={onSourcing} eager={index === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => navigate(active - 1)} aria-label="Slide précédent"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-lg hover:bg-white md:grid">
            <ChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => navigate(active + 1)} aria-label="Slide suivant"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-lg hover:bg-white md:grid">
            <ChevronRight size={22} />
          </button>
          <div className="mt-2 flex justify-center gap-1">
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" onClick={() => navigate(index)}
                aria-label={`Afficher le slide ${index + 1}`} aria-current={index === active ? 'true' : undefined}
                className="grid h-6 min-w-6 place-items-center px-0.5">
                <span className={cn('block h-2 rounded-full transition-all', index === active ? 'w-6 bg-emerald-600 dark:bg-emerald-400' : 'w-2 bg-zinc-300 dark:bg-zinc-700')} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
