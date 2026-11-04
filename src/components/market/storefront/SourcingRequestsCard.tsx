'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatFcfa } from './formatFcfa';
import { Icon } from './Icon';
import { useSourcingModal } from './SourcingModalContext';

type SourcingItem = {
  id: string;
  reference: string;
  publicToken: string;
  status: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  proposal: { productName?: string; productImage?: string; totalClientPrice?: number; deliveryDays?: number } | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Reçue', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  searching: { label: 'Recherche en cours', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
  proposal_ready: { label: 'Proposition prête', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  proposal_sent: { label: 'Proposition prête', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  accepted: { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  fulfilled: { label: 'Livrée', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  rejected: { label: 'Refusée', cls: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  cancelled: { label: 'Annulée', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  expired: { label: 'Expirée', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
};

/** Mes demandes « Trouvez-moi » : suivi des recherches en cours et des propositions à valider. */
export function SourcingRequestsCard() {
  const { open: openSourcing } = useSourcingModal();
  const [items, setItems] = useState<SourcingItem[] | null>(null);

  useEffect(() => {
    fetch('/api/market/sourcing', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return null;
  const toReview = items.filter(i => i.status === 'proposal_ready' || i.status === 'proposal_sent').length;

  return (
    <section className="rounded-2xl bg-white p-4 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-extrabold text-slate-900 dark:text-white">Mes demandes « Trouvez-moi »</p>
          {toReview > 0 && (
            <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">{toReview} proposition{toReview > 1 ? 's' : ''} à consulter</p>
          )}
        </div>
        <button type="button" onClick={() => openSourcing()} className="min-h-[40px] shrink-0 rounded-xl bg-violet-600 px-3 text-[13px] font-semibold text-white">
          Nouvelle demande
        </button>
      </div>

      {items.length === 0 ? (
        <button type="button" onClick={() => openSourcing()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-300 p-3 text-left dark:border-violet-800">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><Icon name="camera" size={18} /></span>
          <span className="text-[13px] text-slate-600 dark:text-slate-300">Une photo, un lien ou une description : notre équipe en Chine trouve le produit et vous envoie un devis sous 24 h ouvrées.</span>
        </button>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.slice(0, 4).map(it => {
            const st = STATUS[it.status] || { label: it.status, cls: 'bg-slate-100 text-slate-700' };
            const img = it.proposal?.productImage || it.imageUrl;
            return (
              <li key={it.id}>
                <Link href={`/market/sourcing/${it.publicToken}`} className="flex min-h-[56px] items-center gap-3 py-2.5">
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-slate-400"><Icon name="camera" size={16} /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-slate-900 dark:text-white">{it.proposal?.productName || it.title || it.description || it.reference}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      {it.proposal?.totalClientPrice ? <span className="font-semibold text-slate-700 dark:text-slate-200">{formatFcfa(it.proposal.totalClientPrice)}</span> : null}
                      <span>{it.reference}</span>
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="shrink-0 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
