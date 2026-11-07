'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import MediaLightbox from '@/components/market/MediaLightbox';
import { isVideoUrl, isYouTubeUrl, youTubeEmbedUrl, youTubeThumbnail } from '@/lib/media';
import { Icon } from './Icon';

/** Lecteur d'une vidéo produit : fichier (MP4/WebM, plateforme source) ou YouTube */
export function ProductVideo({ src, title, className, autoPlay = false }: { src: string; title: string; className?: string; autoPlay?: boolean }) {
  const embed = isYouTubeUrl(src) ? youTubeEmbedUrl(src, autoPlay) : null;
  if (embed) {
    return (
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className={cn('h-full w-full border-0 bg-black', className)}
      />
    );
  }
  return (
    <video
      src={src}
      controls
      playsInline
      autoPlay={autoPlay}
      muted={autoPlay}
      preload="metadata"
      className={cn('h-full w-full bg-black object-contain', className)}
    >
      <track kind="captions" />
    </video>
  );
}

/** Vignette d'une vidéo : aperçu YouTube ou première image de la vidéo, avec pictogramme lecture */
function VideoThumb({ src }: { src: string }) {
  const poster = youTubeThumbnail(src);
  return (
    <span className="relative block h-full w-full bg-slate-900">
      {poster
        ? <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />
        : <video src={`${src}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover opacity-90" />}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
          <Icon name="play" size={14} />
        </span>
      </span>
    </span>
  );
}

interface ProductImageGalleryProps {
  images: string[]
  name: string
  badges?: ReactNode
  className?: string
  activeIndex?: number
  onActiveChange?: (index: number) => void
}

export default function ProductImageGallery({
  images,
  name,
  badges,
  className,
  activeIndex: controlledActive,
  onActiveChange,
}: ProductImageGalleryProps) {
  const [internalActive, setInternalActive] = useState(0);
  const active = controlledActive ?? internalActive;
  const setActive = (i: number) => {
    if (controlledActive === undefined) setInternalActive(i);
    onActiveChange?.(i);
  };
  const [lightbox, setLightbox] = useState(false);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Zoom au survol (desktop, style Amazon) : l'image zoome vers le curseur
  const [hoverZoom, setHoverZoom] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const canHover = useRef(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canHover.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    canHover.current = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover.current && scale <= 1.05) setHoverZoom(true);
  };

  const handleMouseLeave = () => setHoverZoom(false);

  const touch = useRef<{
    startX: number
    startY: number
    startTime: number
    startScale: number
    startPan: { x: number; y: number }
    pinchStartDist: number
    activeTouches: number
    lastTap: number
    startDeltaX: number
    startDeltaY: number
  } | null>(null);
  const ignoreNextClick = useRef(false);

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = active + dir;
      if (next < 0) setActive(images.length - 1);
      else if (next >= images.length) setActive(0);
      else setActive(next);
      setScale(1);
      setPan({ x: 0, y: 0 });
    },
    [active, images.length]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches;
    if (t.length === 2) {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      touch.current = {
        startX: (t[0].clientX + t[1].clientX) / 2,
        startY: (t[0].clientY + t[1].clientY) / 2,
        startTime: Date.now(),
        startScale: scale,
        startPan: { ...pan },
        pinchStartDist: Math.hypot(dx, dy),
        activeTouches: 2,
        lastTap: 0,
        startDeltaX: 0,
        startDeltaY: 0,
      };
    } else if (t.length === 1) {
      touch.current = {
        startX: t[0].clientX,
        startY: t[0].clientY,
        startTime: Date.now(),
        startScale: scale,
        startPan: { ...pan },
        pinchStartDist: 0,
        activeTouches: 1,
        lastTap: touch.current?.lastTap || 0,
        startDeltaX: 0,
        startDeltaY: 0,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches;
    if (!touch.current) return;

    if (t.length === 2) {
      e.preventDefault();
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / (touch.current.pinchStartDist || 1);
      const nextScale = Math.min(Math.max(touch.current.startScale * ratio, 1), 4);
      setScale(nextScale);
      const midX = (t[0].clientX + t[1].clientX) / 2;
      const midY = (t[0].clientY + t[1].clientY) / 2;
      const deltaMidX = midX - touch.current.startX;
      const deltaMidY = midY - touch.current.startY;
      setPan({
        x: touch.current.startPan.x + deltaMidX / nextScale,
        y: touch.current.startPan.y + deltaMidY / nextScale,
      });
    } else if (t.length === 1 && touch.current.activeTouches === 1) {
      const deltaX = t[0].clientX - touch.current.startX;
      const deltaY = t[0].clientY - touch.current.startY;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) + 10;

      if (scale > 1.05) {
        e.preventDefault();
        setPan({
          x: touch.current.startPan.x + deltaX / scale,
          y: touch.current.startPan.y + deltaY / scale,
        });
      } else if (isHorizontal) {
        e.preventDefault();
        setPan({ x: deltaX, y: 0 });
      } else {
        // laisser le scroll vertical naturel
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const changed = e.changedTouches[0];
    if (!changed || !touch.current) return;

    if (touch.current.activeTouches === 1 && scale <= 1.05) {
      const deltaX = changed.clientX - touch.current.startX;
      const deltaY = changed.clientY - touch.current.startY;
      const elapsed = Date.now() - touch.current.startTime;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        go(deltaX > 0 ? -1 : 1);
      } else if (
        Math.abs(deltaX) < 15 &&
        Math.abs(deltaY) < 15 &&
        elapsed < 300
      ) {
        const now = Date.now();
        if (now - touch.current.lastTap < 300) {
          // double tap => zoom toggle
          if (scale > 1.05) {
            setScale(1);
            setPan({ x: 0, y: 0 });
          } else {
            setScale(2.5);
            setPan({ x: 0, y: 0 });
          }
          touch.current.lastTap = 0;
          ignoreNextClick.current = true;
        } else {
          touch.current.lastTap = now;
          ignoreNextClick.current = true;
          setTimeout(() => { ignoreNextClick.current = false; }, 500);
        }
      } else {
        setPan({ x: 0, y: 0 });
      }
    }

    if (e.touches.length === 0) {
      touch.current.activeTouches = 0;
    } else if (e.touches.length === 1) {
      touch.current.activeTouches = 1;
      touch.current.startX = e.touches[0].clientX;
      touch.current.startY = e.touches[0].clientY;
      touch.current.startPan = { ...pan };
    }
  };

  const handleMainClick = () => {
    if (ignoreNextClick.current) {
      ignoreNextClick.current = false;
      return;
    }
    if (!lightbox) setLightbox(true);
  };

  const current = images[active] || images[0] || '/placeholder.svg';
  const currentIsVideo = isVideoUrl(current);
  const hoverZoomed = hoverZoom && scale <= 1.05 && !currentIsVideo;
  // La visionneuse plein écran ne montre que les photos (les vidéos se lisent sur place)
  const photos = images.filter(src => !isVideoUrl(src));
  const photoIndex = Math.max(0, photos.indexOf(current));

  return (
    <div className={cn('bg-white dark:bg-slate-900 lg:flex lg:flex-row-reverse lg:gap-3 lg:p-3', className)}>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 select-none lg:aspect-square lg:min-w-0 lg:flex-1 lg:rounded-xl"
        onMouseEnter={currentIsVideo ? undefined : handleMouseEnter}
        onMouseMove={currentIsVideo ? undefined : handleMouseMove}
        onMouseLeave={currentIsVideo ? undefined : handleMouseLeave}
        style={{ cursor: hoverZoomed ? 'zoom-in' : undefined }}
      >
        {currentIsVideo ? (
          <ProductVideo key={current} src={current} title={`Vidéo — ${name}`} />
        ) : (
          <img
            src={current}
            alt={name}
            draggable={false}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleMainClick}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
            className="h-full w-full object-contain transition-transform duration-200"
            style={
              hoverZoomed
                ? {
                    transform: 'scale(1.8)',
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    transitionDuration: '100ms',
                  }
                : {
                    transform: `translateX(${pan.x}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    touchAction: 'pan-y',
                  }
            }
          />
        )}
        {!currentIsVideo && badges}
        {!currentIsVideo && photos.length > 0 && (
          <button type="button" onClick={() => setLightbox(true)} aria-label="Agrandir les photos" title="Agrandir les photos" className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-lg bg-white text-slate-900 shadow focus-visible:outline-2 focus-visible:outline-emerald-700">
            <Icon name="search" size={20} />
          </button>
        )}
        {images.length > 1 && !currentIsVideo && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Média précédent" className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white lg:grid">
              <Icon name="chevronLeft" size={20} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Média suivant" className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white lg:grid">
              <Icon name="chevronRight" size={20} />
            </button>
          </>
        )}
        {!currentIsVideo && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Miniatures : bande horizontale sur mobile, colonne à gauche sur ordinateur (comme Alibaba / 1688) */}
      <div className="flex gap-2 overflow-x-auto p-3 lg:max-h-[min(560px,calc(100vh-8rem))] lg:w-[76px] lg:flex-none lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:p-0">
        {images.map((src, i) => {
          const video = isVideoUrl(src);
          return (
            <button
              key={`${src}-${i}`}
              type="button"
              aria-label={video ? `Vidéo de ${name}` : `Photo ${i + 1} de ${name}`}
              aria-pressed={active === i}
              onClick={() => { setActive(i); setScale(1); setPan({ x: 0, y: 0 }); }}
              onMouseEnter={() => { if (!video && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setActive(i); }}
              className={cn(
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 dark:bg-slate-800 lg:h-[72px] lg:w-[72px]',
                active === i ? 'border-emerald-600' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              {video
                ? <VideoThumb src={src} />
                : <img loading="lazy" decoding="async" src={src} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover" />}
            </button>
          );
        })}
      </div>

      {lightbox && photos.length > 0 && (
        <MediaLightbox
          images={photos}
          index={photoIndex}
          name={name}
          onClose={() => { setLightbox(false); setScale(1); setPan({ x: 0, y: 0 }); }}
          onIndexChange={(i) => setActive(Math.max(0, images.indexOf(photos[i])))}
        />
      )}
    </div>
  );
}
