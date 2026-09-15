'use client';

import { Suspense } from 'react';
import ScreenCatalog from '@/components/market/batch1/screens/ScreenCatalog';
import { ProductGridSkeleton } from '@/components/market/batch1/Skeleton';

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6"><ProductGridSkeleton count={8} /></div>}>
      <ScreenCatalog />
    </Suspense>
  );
}