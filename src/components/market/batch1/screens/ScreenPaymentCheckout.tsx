'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Shield,
  Copy,
  Check,
  Package,
  Smartphone,
  Truck,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import type { PaymentSettings } from '@/lib/payments/settings';

type ProviderKey = 'wave' | 'om' | 'free' | 'wire' | 'gateway';

interface PaymentItem {
  name: string
  qty: number
  price: number
  image?: string
  variant?: string
}

interface ScreenPaymentCheckoutProps {
  reference: string
  amount: number
  items: PaymentItem[]
  settings: PaymentSettings
  phone?: string
}

const WAVE = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#1D1D1B" /><path d="M18 8c-1.5 0-2.5 1-3.5 2.5C13.5 12 12.5 13 11 13s-2.5-1-3.5-2.5C6.5 9 5.5 8 4 8" stroke="#9AE5D3" strokeWidth="2.5" strokeLinecap="round" /></svg>
);
const OM = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#FF6600" /><circle cx="12" cy="12" r="6" fill="#FFF" /><path d="M9 12h6M12 9v6" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" /></svg>
);
const FREE = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#00A0DF" /><path d="M7 12h10M12 7v10" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" /></svg>
);

interface MethodDef {
  key: ProviderKey
  label: string
  sub: string
  merchantPhone: string
  accentBg: string
  initials: string
  instructions: string[]
}

export default function ScreenPaymentCheckout({ reference, amount, items, settings, phone: initialPhone = '' }: ScreenPaymentCheckoutProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProviderKey>(settings.providers.gateway.active ? 'gateway' : 'wave');
  const [clientPhone, setClientPhone] = useState(initialPhone);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  const totalPcs = items.reduce((s, i) => s + i.qty, 0);

  const paymentMethods: MethodDef[] = [
    {
      key: 'wave',
      label: 'Wave',
      sub: 'Instant · Sans frais',
      merchantPhone: settings.providers.manual.waveMerchantPhone || '+221 78 000 00 00',
      accentBg: 'bg-[#00B0F0]',
      initials: 'W',
      instructions: ['Ouvrez votre application Wave.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Wave pour la confirmation.'],
    },
    {
      key: 'om',
      label: 'Orange Money',
      sub: 'Instant · Frais standards',
      merchantPhone: settings.providers.manual.orangeMerchantPhone || '+221 77 111 11 11',
      accentBg: 'bg-[#FF6600]',
      initials: 'OM',
      instructions: ['Ouvrez votre application Orange Money.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Orange Money pour la confirmation.'],
    },
    {
      key: 'free',
      label: 'Free Money',
      sub: 'Instant · Frais standards',
      merchantPhone: settings.providers.manual.freeMoneyMerchantPhone || '+221 76 222 22 22',
      accentBg: 'bg-[#CD0067]',
      initials: 'F',
      instructions: ['Ouvrez votre application Free Money.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Free Money pour la confirmation.'],
    },
    {
      key: 'wire',
      label: 'Virement bancaire',
      sub: '24-48h · Pour gros volumes',
      merchantPhone: '',
      accentBg: 'bg-slate-700',
      initials: 'VB',
      instructions: ['Effectuez un virement sur le compte indiqué.', `Mentionnez impérativement la référence ${reference}.`, 'Envoyez le reçu par WhatsApp pour validation.'],
    },
  ];

  if (settings.providers.gateway.active) {
    paymentMethods.unshift({
      key: 'gateway',
      label: `Paiement ${settings.providers.gateway.provider || 'en ligne'}`.replace(/^Paiement $/, 'Paiement en ligne'),
      sub: 'Carte · Instantané',
      merchantPhone: '',
      accentBg: 'bg-emerald-600',
      initials: 'CB',
      instructions: ['Cliquez sur Payer pour être redirigé vers la passerelle sécurisée.', 'Finalisez le paiement.', 'Vous serez automatiquement redirigé.'],
    });
  }

  const method = paymentMethods.find((m) => m.key === selected);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const copyMerchant = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (paymentStatus === 'paid') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (data?.status === 'paid' || data?.status === 'completed') {
          setPaymentStatus('paid');
          showToast('Paiement confirmé ! Redirection...');
          setTimeout(() => router.push(`/suivi/${reference}`), 2000);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [reference, paymentStatus, router, showToast]);

  const handlePay = async () => {
    if (loading || !method) return;
    setLoading(true);
    try {
      if (selected === 'gateway') {
        const response = await fetch('/api/payment/checkout/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const data = await response.json();
        if (data?.url) window.location.href = data.url;
        else if (data?.error) showToast(data.error);
        else showToast('Erreur lors du lancement du paiement');
        return;
      }
      if (selected === 'wire') {
        showToast('Veuillez effectuer le virement puis envoyer le reçu par WhatsApp.');
        return;
      }
      const providerMap: Record<string, string> = { wave: 'wave', om: 'orange_money', free: 'free_money' };
      const apiProvider = providerMap[selected];
      if (!apiProvider) {
        showToast('Moyen de paiement non pris en charge');
        return;
      }
      const response = await fetch('/api/market/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: reference, provider: apiProvider, clientPhone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Erreur lors du lancement du paiement');
        return;
      }
      showToast(data.message || 'Paiement initié. Confirmez depuis votre téléphone.');
    } catch {
      showToast('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const MethodTile = ({ m, active, onClick }: { m: MethodDef; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={cn(
      'flex w-full items-center gap-3 rounded-2xl border-2 p-3 md:p-4 text-left transition-all',
      active ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
    )}>
      <span className={cn('grid h-11 w-11 md:h-12 md:w-12 flex-shrink-0 place-items-center rounded-xl text-white font-extrabold text-[13px] md:text-[14px]', m.accentBg)}>
        {m.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] md:text-[14px] font-extrabold text-slate-900 dark:text-white">{m.label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{m.sub}</p>
      </div>
      <span className={cn('grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2', active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600')}>
        {active && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  );

  const Instructions = () => {
    if (selected === 'wire') {
      return (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2">Coordonnées bancaires DDM+</p>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-blue-100 dark:border-blue-950">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">IBAN</p>
            <p className="mt-0.5 font-mono text-[12px] font-bold text-slate-900 dark:text-white break-all">{'SN12 0001 2345 6789 0123 4567 890'}</p>
          </div>
          <p className="mt-2 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
            Mentionnez la référence <b className="font-mono">{reference}</b> lors du virement. Validation sous 24-48h après réception.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Instructions {method?.label}</p>
        <ol className="space-y-2.5 text-[12px] text-slate-700 dark:text-slate-300">
          {method?.instructions.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
          {selected !== 'gateway' && method?.merchantPhone && (
            <li className="pl-7">
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] font-extrabold text-slate-900 dark:text-white">{method.merchantPhone}</span>
                <button onClick={() => copyMerchant(method.merchantPhone)} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap inline-flex items-center gap-1">
                  {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copié' : 'Copier'}
                </button>
              </div>
            </li>
          )}
        </ol>
      </div>
    );
  };

  const OrderRecap = ({ sticky = false }) => (
    <div className={cn('rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden', sticky && 'md:sticky md:top-24')}>
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Récapitulatif</p>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{reference}</p>
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <Package size={18} className="m-auto text-slate-400" />}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-slate-900 dark:bg-white dark:text-slate-900 px-1 text-[9px] font-bold text-white tabular-nums">{it.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">{it.variant}</p>
            </div>
            <p className="text-[11px] font-extrabold tabular-nums whitespace-nowrap text-slate-900 dark:text-white flex-shrink-0">{formatFcfa(it.price * it.qty)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-1.5 text-[12px]">
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sous-total</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{formatFcfa(amount)}</span></div>
        <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">Total à payer</span>
          <span className="text-[22px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatFcfa(amount)}</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Shield size={10} />Escrow · débité seulement après réception</p>
      </div>
    </div>
  );

  const TrustFooter = () => (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><MessageCircle size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">Un problème avec le paiement ?</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400">Notre équipe est disponible 7j/7 sur WhatsApp</p>
        </div>
        <a href={`https://wa.me/221761234567?text=Problème paiement ${reference}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 flex-shrink-0 inline-flex items-center gap-1">
          <MessageCircle size={12} />Contact
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/produits" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Catalogue
            </Link>
          </div>
          <Link href="/" className="hidden sm:flex items-center gap-2">
            <span className="font-extrabold text-lg text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/panier" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium flex items-center gap-1.5">
              Panier
            </Link>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900 text-white px-4 py-2 text-[12px] font-semibold shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-4 md:py-6">
        <div className="mb-4 md:mb-6 flex items-center gap-2 text-[12px]">
          <Link href="/produits" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">Catalogue</Link>
          <span className="text-slate-400">›</span>
          <Link href="/panier" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">Panier</Link>
          <span className="text-slate-400">›</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Paiement</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-4 md:gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Montant à payer</p>
                  <p className="mt-1 text-[32px] md:text-[42px] font-extrabold tabular-nums whitespace-nowrap leading-none">{formatFcfa(amount)}</p>
                  <p className="mt-2 text-[12px] text-white/85 flex items-center gap-1"><Package size={12} />{totalPcs} pcs · {items.length} articles</p>
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Référence</p>
                  <p className="text-[13px] font-mono font-bold">{reference}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-5">
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Choisissez un mode de paiement</p>
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map((m) => (
                  <MethodTile key={m.key} m={m} active={selected === m.key} onClick={() => setSelected(m.key)} />
                ))}
              </div>
              <div className="mt-5"><Instructions /></div>

              {selected !== 'wire' && selected !== 'gateway' && (
                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre numéro {method?.label}</label>
                  <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">🇸🇳 +221</span>
                    <Smartphone size={14} className="text-slate-400" />
                    <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="77 000 00 00" className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white tabular-nums" />
                  </div>
                </div>
              )}
            </div>

            <TrustFooter />
          </div>

          <div>
            <div className="md:sticky md:top-24 space-y-4">
              <OrderRecap />
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                Payer {formatFcfa(amount)}
              </button>
              <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Shield size={11} />Escrow · débité seulement après réception</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
