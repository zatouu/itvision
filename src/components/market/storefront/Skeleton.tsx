import { cn } from '@/lib/utils';

/**
 * Squelettes de chargement.
 *
 * Les écrans market affichaient « Chargement… » centré plein écran en attendant
 * leurs appels API : écran vide à chaque visite, sans indication de structure.
 * Un squelette conserve la mise en page et supprime le saut visuel.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800', className)}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-2 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)} role="status" aria-label="Chargement des produits">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Squelette d'accueil : hero + rangée de produits, aux proportions réelles. */
export function HomeSkeleton() {
  return (
    <div className="overflow-x-hidden bg-slate-50 dark:bg-slate-950" role="status" aria-label="Chargement de l’accueil">
      <Skeleton className="h-[280px] rounded-none md:h-[420px]" />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Skeleton className="h-4 w-40" />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
