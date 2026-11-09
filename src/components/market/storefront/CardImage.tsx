'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isDisplayableMediaUrl, isVideoUrl } from '@/lib/media';
import { Icon } from './Icon';

// Nos fichiers enregistrés en URL absolue (autre domaine du même serveur) : servis en relatif
const OWN_UPLOAD_RE = /^https?:\/\/(?:www\.)?(?:itvisionplus\.sn|ddm\.sn|market\.itvisionplus\.sn)(\/(?:api\/)?uploads\/.+)$/i;
const RETRY_DELAY_MS = 1500;

export function localUploadUrl(url: string): string {
  const match = url.match(OWN_UPLOAD_RE);
  return match ? match[1].replace(/^\/uploads\//, '/api/uploads/') : url;
}

function candidatesOf(sources: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const raw of sources) {
    if (!isDisplayableMediaUrl(raw) || isVideoUrl(raw) || raw.endsWith('/placeholder.svg')) continue;
    seen.add(localUploadUrl(raw));
  }
  return [...seen];
}

export interface CardImageProps {
  /** Images par ordre de préférence : la suivante prend le relais si la précédente échoue */
  sources: (string | null | undefined)[];
  alt: string;
  className?: string;
}

/**
 * Visuel de carte : un échec passager (réseau mobile, page chargée de vignettes) est retenté
 * une fois avant de passer à l'image suivante ; le fond neutre n'apparaît qu'en dernier recours.
 */
export function CardImage({ sources, alt, className }: CardImageProps) {
  const candidates = useMemo(() => candidatesOf(sources), [sources.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [retried, setRetried] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setIndex(0); setRetried(false); }, [candidates]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const current = candidates[index];
  const src = current && retried ? `${current}${current.includes('?') ? '&' : '?'}r=1` : current;

  const handleError = useCallback(() => {
    clearTimeout(timer.current);
    if (!retried) {
      timer.current = setTimeout(() => setRetried(true), RETRY_DELAY_MS);
      return;
    }
    setRetried(false);
    setIndex(i => i + 1);
  }, [retried]);

  // Rendu serveur : l'échec peut précéder l'hydratation (onError jamais reçu)
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) handleError();
  }, [handleError]);

  if (!src) {
    return (
      <div aria-label={alt} role="img" className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300 dark:from-slate-800 dark:to-slate-700 dark:text-slate-600">
        <Icon name="package" size={36} />
      </div>
    );
  }

  return (
    <img key={src} ref={imgRef} loading="lazy" decoding="async" src={src} alt={alt} onError={handleError}
      className={cn('absolute inset-0 h-full w-full object-cover', className)} />
  );
}
