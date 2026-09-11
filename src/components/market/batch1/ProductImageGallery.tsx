'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

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

  const imageSrc = images[active] || images[0] || '/placeholder.svg';

  return (
    <div className={cn('bg-white dark:bg-slate-900', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 select-none">
        <img
          src={imageSrc}
          alt={name}
          draggable={false}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleMainClick}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
          className="h-full w-full object-cover transition-transform duration-200"
          style={{
            transform: `translateX(${pan.x}px) scale(${scale})`,
            transformOrigin: 'center center',
            touchAction: 'pan-y',
          }}
        />
        {badges}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {active + 1} / {images.length}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto p-3">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setScale(1); setPan({ x: 0, y: 0 }); }}
            className={cn(
              'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 dark:bg-slate-800',
              active === i ? 'border-emerald-600' : 'border-transparent'
            )}
          >
            <img src={src} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => { setLightbox(false); setScale(1); setPan({ x: 0, y: 0 }); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); setScale(1); setPan({ x: 0, y: 0 }); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
          >
            <Icon name="x" size={20} />
          </button>
          <img
            src={imageSrc}
            alt={name}
            draggable={false}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              touchAction: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
