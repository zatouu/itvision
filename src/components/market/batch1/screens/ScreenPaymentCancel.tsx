'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, RefreshCw, Clock, MessageCircle } from 'lucide-react';
import { formatFcfa } from '../formatFcfa';

interface ScreenPaymentCancelProps {
  reference?: string;
  orderId?: string;
  amount?: number;
}

export default function ScreenPaymentCancel({ reference, orderId, amount }: ScreenPaymentCancelProps) {
  const [order, setOrder] = useState<{ id?: string; amount?: number } | null>(null);

  useEffect(() => {
    if (orderId || reference) {
      fetch(`/api/payment/status?reference=${encodeURIComponent(orderId || reference || '')}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.status) {
            setOrder({
              id: data.orderId || data.groupId || orderId || reference,
              amount: data.total || amount,
            });
          }
        })
        .catch(() => {});
    }
  }, [orderId, reference, amount]);

  const displayedRef = reference || order?.id || '';
  const displayedAmount = amount ?? order?.amount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4">
          <p className="text-[18px] font-extrabold text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:py-16 flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-500/10" />
          <div className="relative grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30">
            <X size={44} strokeWidth={3.5} />
          </div>
        </div>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">Paiement annulé</p>
        <h1 className="mt-1 text-[24px] md:text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white text-center">Votre paiement a été annulé</h1>
        <p className="mt-2 text-[13px] md:text-[15px] text-slate-500 dark:text-slate-400 text-center max-w-md">
          <b className="text-slate-900 dark:text-white">Aucune somme n&apos;a été débitée.</b> Vous pouvez réessayer avec le même mode de paiement ou en choisir un autre.
        </p>
        {displayedRef && (
          <p className="mt-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">Réf. {displayedRef}</p>
        )}

        {(orderId || displayedRef) && (
          <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commande concernée</p>
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{order?.id || orderId || displayedRef}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">En attente</span>
            </div>
            {typeof displayedAmount === 'number' && displayedAmount > 0 && (
              <>
                <div className="my-3 h-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Montant à régler</span>
                  <span className="text-[20px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatFcfa(displayedAmount)}</span>
                </div>
              </>
            )}
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock size={11} /> Vous avez <b>48h</b> pour finaliser le paiement, sinon la commande sera annulée.
            </p>
          </div>
        )}

        <div className="mt-6 w-full max-w-md rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Raisons possibles</p>
          <ul className="space-y-1.5 text-[12px] text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2"><X size={13} className="mt-0.5 text-red-500 flex-shrink-0" />Vous avez fermé la fenêtre de paiement</li>
            <li className="flex items-start gap-2"><X size={13} className="mt-0.5 text-red-500 flex-shrink-0" />Solde insuffisant sur votre compte mobile money</li>
            <li className="flex items-start gap-2"><X size={13} className="mt-0.5 text-red-500 flex-shrink-0" />Délai d&apos;attente dépassé côté opérateur</li>
          </ul>
        </div>

        <div className="mt-6 w-full max-w-md flex gap-3 flex-col sm:flex-row">
          <Link
            href="/produits"
            className="flex-1 inline-flex items-center justify-center h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition"
          >
            Continuer mes achats
          </Link>
          {displayedRef && (
            <Link
              href={`/paiement/checkout/${encodeURIComponent(displayedRef)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
            >
              <RefreshCw size={16} /> Réessayer le paiement
            </Link>
          )}
        </div>

        <div className="mt-6 w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><MessageCircle size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">Besoin d&apos;aide ?</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">Notre équipe résout les blocages sous 15 min</p>
            </div>
            <a
              href="https://wa.me/221761234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 transition"
            >
              <MessageCircle size={12} className="mr-1" /> Contact
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
