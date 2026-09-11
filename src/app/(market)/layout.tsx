'use client';

import MarketHeader from '@/components/MarketHeader';
import MarketFooter from '@/components/MarketFooter';
import MarketBottomNav from '@/components/MarketBottomNav';
import { SourcingModalProvider } from '@/components/market/batch1/SourcingModalContext';
import SourcingRequestModal from '@/components/market/batch1/SourcingRequestModal';

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <SourcingModalProvider>
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <MarketHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <MarketFooter />
        <MarketBottomNav />
      </div>
      <SourcingRequestModal />
    </SourcingModalProvider>
  );
}
