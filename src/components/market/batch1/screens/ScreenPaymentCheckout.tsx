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
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { MARKET_BRAND, brandWhatsAppUrl } from '@/lib/branding';
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
  orderType: 'order' | 'group'
  amount: number
  items: PaymentItem[]
  settings: PaymentSettings
  phone?: string
  customerName?: string
  /** Tracking token invité — propagé aux APIs de paiement */
  token?: string
  /** Redirection après paiement confirmé */
  successUrl: string
}

interface MethodDef {
  key: ProviderKey
  label: string
  sub: string
  merchantPhone: string
  accentBg: string
  initials: string
  instructions: string[]
}

export default function ScreenPaymentCheckout({
  reference,
  orderType,
  amount,
  items,
  settings,
  phone: initialPhone = '',
  customerName,
  token,
  successUrl,
}: ScreenPaymentCheckoutProps) {
  const router = useRouter();
  const [clientPhone, setClientPhone] = useState(initialPhone);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  const totalPcs = items.reduce((s, i) => s + i.qty, 0);
  const manual = settings.providers.manual;

  // Les méthodes manuelles (P2P) ne fonctionnent que pour les commandes
  // standard : l'endpoint /api/market/payments/initiate prend un orderId.
  // Pour les achats groupés, la gateway sécurisée et le virement restent
  // disponibles. Une méthode sans numéro marchand configuré est masquée.
  const paymentMethods: MethodDef[] = [];

  if (settings.providers.gateway.active) {
    paymentMethods.push({
      key: 'gateway',
      label: `Paiement ${settings.providers.gateway.provider || 'en ligne'}`.replace(/^Paiement $/, 'Paiement en ligne'),
      sub: 'Carte · Mobile Money · Instantané',
      merchantPhone: '',
      accentBg: 'bg-emerald-600',
      initials: 'CB',
      instructions: ['Cliquez sur Payer pour être redirigé vers la passerelle sécurisée.', 'Finalisez le paiement.', 'Vous serez automatiquement redirigé.'],
    });
  }

  if (orderType === 'order') {
    if (manual.waveMerchantPhone || manual.wavePayUrl) {
      paymentMethods.push({
        key: 'wave',
        label: 'Wave',
        sub: 'Instant · Sans frais',
        merchantPhone: manual.waveMerchantPhone,
        accentBg: 'bg-[#00B0F0]',
        initials: 'W',
        instructions: ['Ouvrez votre application Wave.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Wave pour la confirmation.'],
      });
    }
    if (manual.orangeMerchantPhone) {
      paymentMethods.push({
        key: 'om',
        label: 'Orange Money',
        sub: 'Instant · Frais standards',
        merchantPhone: manual.orangeMerchantPhone,
        accentBg: 'bg-[#FF6600]',
        initials: 'OM',
        instructions: ['Ouvrez votre application Orange Money.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Orange Money pour la confirmation.'],
      });
    }
    if (manual.freeMoneyMerchantPhone) {
      paymentMethods.push({
        key: 'free',
        label: 'Free Money',
        sub: 'Instant · Frais standards',
        merchantPhone: manual.freeMoneyMerchantPhone,
        accentBg: 'bg-[#CD0067]',
        initials: 'F',
        instructions: ['Ouvrez votre application Free Money.', `Envoyez ${formatFcfa(amount)} au numéro marchand ci-dessous.`, 'Renseignez votre numéro Free Money pour la confirmation.'],
      });
    }
  }

  if (manual.bankIban) {
    paymentMethods.push({
      key: 'wire',
      label: 'Virement bancaire',
      sub: '24-48h · Pour gros volumes',
      merchantPhone: '',
      accentBg: 'bg-slate-700',
      initials: 'VB',
      instructions: ['Effectuez un virement sur le compte indiqué.', `Mentionnez impérativement la référence ${reference}.`, 'Envoyez le reçu par WhatsApp pour validation.'],
    });
  }

  const [selected, setSelected] = useState<ProviderKey>((paymentMethods[0]?.key ?? 'gateway') as ProviderKey);
  const method = paymentMethods.find((m) => m.key === selected) ?? paymentMethods[0];

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
          setTimeout(() => router.push(successUrl), 2000);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [reference, paymentStatus, router, showToast, successUrl]);

  const handlePay = async () => {
    if (loading || !method) return;
    setLoading(true);
    try {
      if (method.key === 'gateway') {
        const response = await fetch('/api/payment/checkout/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, token }),
        });
        const data = await response.json();
        if (data?.url) window.location.href = data.url;
        else if (data?.error) showToast(data.error);
        else showToast('Erreur lors du lancement du paiement');
        return;
      }
      if (method.key === 'wire') {
        showToast('Veuillez effectuer le virement puis envoyer le reçu par WhatsApp.');
        return;
      }
      const providerMap: Partial<Record<ProviderKey, string>> = { wave: 'wave', om: 'orange_money', free: 'free_money' };
      const apiProvider = providerMap[method.key];
      if (!apiProvider) {
        showToast('Moyen de paiement non pris en charge');
        return;
      }
      const response = await fetch('/api/market/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: reference, provider: apiProvider, clientPhone, token }),
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
    if (method?.key === 'wire') {
      return (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2">Coordonnées bancaires DDM+</p>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-blue-100 dark:border-blue-950 space-y-2">
            {manual.bankName && (
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Banque</p>
                <p className="mt-0.5 text-[12px] font-bold text-slate-900 dark:text-white">{manual.bankName}</p>
              </div>
            )}
            {manual.bankAccountName && (
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Titulaire</p>
                <p className="mt-0.5 text-[12px] font-bold text-slate-900 dark:text-white">{manual.bankAccountName}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">IBAN / RIB</p>
              <p className="mt-0.5 font-mono text-[12px] font-bold text-slate-900 dark:text-white break-all">{manual.bankIban}</p>
            </div>
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
              <span>{step}</span>
            </li>
          ))}
          {method?.key !== 'gateway' && method?.merchantPhone && (
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

  const OrderRecap = () => (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
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
        {customerName && (
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Payé par</span><span className="font-semibold text-slate-900 dark:text-white">{customerName}</span></div>
        )}
        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sous-total</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{formatFcfa(amount)}</span></div>
        <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">Total à payer</span>
          <span className="text-[22px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatFcfa(amount)}</span>
        </div>
        {settings.providers.escrow.enabled && (
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Shield size={10} />Paiement sécurisé · débité seulement après confirmation</p>
        )}
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
        <a href={brandWhatsAppUrl(MARKET_BRAND, `Problème paiement ${reference}`)} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 flex-shrink-0 inline-flex items-center gap-1">
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
          <span className="text-slate-700 dark:text-slate-300 font-medium">Paiement</span>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="max-w-md mx-auto rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-6 text-center">
            <p className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-2">Paiement en ligne indisponible</p>
            <p className="text-[12px] text-slate-600 dark:text-slate-400 mb-4">
              Aucun moyen de paiement n&apos;est configuré pour le moment. Contactez-nous sur WhatsApp pour finaliser votre paiement de {formatFcfa(amount)}.
            </p>
            <a href={brandWhatsAppUrl(MARKET_BRAND, `Paiement ${reference} — ${formatFcfa(amount)}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-700">
              <MessageCircle size={15} /> Contacter le support
            </a>
          </div>
        ) : (
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
                  <MethodTile key={m.key} m={m} active={method?.key === m.key} onClick={() => setSelected(m.key)} />
                ))}
              </div>
              <div className="mt-5"><Instructions /></div>

              {method && method.key !== 'wire' && method.key !== 'gateway' && (
                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre numéro {method.label}</label>
                  <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
                    <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">+221</span>
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
              {settings.providers.escrow.enabled && (
                <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Shield size={11} />Paiement sécurisé · débité seulement après confirmation</p>
              )}
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
