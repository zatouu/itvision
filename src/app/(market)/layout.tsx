'use client';

import MarketHeader from '@/components/MarketHeader';
import MarketFooter from '@/components/MarketFooter';
import MarketBottomNav from '@/components/MarketBottomNav';
import { SourcingModalProvider } from '@/components/market/storefront/SourcingModalContext';
import SourcingRequestModal from '@/components/market/storefront/SourcingRequestModal';
import ReferralCapture from '@/components/market/ReferralCapture';
import CsrfFetch from '@/components/market/CsrfFetch';

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <SourcingModalProvider>
      <CsrfFetch />
      <ReferralCapture />
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader />
        <main className="flex-1 pb-[var(--mkt-bottom-nav-h,calc(6rem+env(safe-area-inset-bottom)))] md:pb-0">{children}</main>
        <MarketFooter />
        <MarketBottomNav />
      </div>
      <SourcingRequestModal />
    </SourcingModalProvider>
  );
}
