'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  HelpCircle,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  Share2,
  Smartphone,
  Truck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import OrderChat from '@/components/OrderChat';
import { orderStatusMeta, isPaymentSettled } from '@/lib/order-status';
import { MARKET_BRAND, brandWhatsAppUrl } from '@/lib/branding';

interface OrderItem {
  id?: string
  _id?: string
  name: string
  qty: number
  price: number
  image?: string
  variant?: string
}

interface OrderDetails {
  orderId: string
  clientName: string
  clientEmail?: string
  clientPhone: string
  items: OrderItem[]
  subtotal: number
  subtotalBeforeDiscounts?: number
  shipping: { method?: string; totalCost?: number } | null
  total: number
  status: string
  paymentStatus: string
  address?: {
    street?: string
    city?: string
    department?: string
    region?: string
    country?: string
    notes?: string
  }
  delivery?: {
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
    estimatedDeliveryDate?: string
    status?: string
    lastUpdate?: string
  }
  createdAt: string
  currency: string
  fees?: {
    supplierCost: number
    serviceFeeRate: number
    serviceFeeStandardRate: number
    serviceFeeAmount: number
    serviceFeeSavings: number
    insuranceRate: number
    insuranceAmount: number
    totalFees: number
    quantityDiscount?: { percent: number; amount: number; label: string }
  }
}

interface ScreenOrderDetailProps {
  order: OrderDetails;
  token?: string | null;
}

const ORDER_STEPS = [
  { key: 'ordered', label: 'Commande confirmée', desc: 'Votre commande est enregistrée et validée.', icon: 'check' },
  { key: 'sourcing', label: 'Sourcing en cours', desc: 'Nous recherchons le meilleur fournisseur.', icon: 'package' },
  { key: 'china', label: 'Inspection qualité', desc: 'Contrôle qualité avant expédition.', icon: 'package' },
  { key: 'in_transit', label: 'En transit', desc: 'Votre commande est en route vers le Sénégal.', icon: 'truck' },
  { key: 'delivered', label: 'Livrée', desc: 'Commande livrée et confirmée.', icon: 'check' },
];

// Statuts serveur → étape timeline + libellé (mapping canonique partagé)
const statusIndex = (status: string) => orderStatusMeta(status).step || 1;
const statusLabel = (status: string) => orderStatusMeta(status).label;

const statusTone = (status: string) => {
  if (status === 'delivered') return 'emerald';
  if (['cancelled', 'disputed', 'refunded'].includes(status)) return 'red';
  if (['in_transit', 'shipped', 'out_for_delivery', 'transit'].includes(status)) return 'blue';
  if (['pending', 'new', 'sourcing', 'confirmed', 'processing'].includes(status)) return 'amber';
  return 'slate';
};

// Classes explicites (Tailwind ne génère pas les classes construites dynamiquement)
const STATUS_BADGE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function ScreenOrderDetail({ order, token }: ScreenOrderDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'recap' | 'suivi' | 'delivery' | 'actions'>('recap');
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const isCancelled = orderStatusMeta(order.status).ui === 'cancelled';
  const paid = isPaymentSettled(order.paymentStatus);
  const currentStep = statusIndex(order.status);
  const tracking = order.delivery?.trackingNumber || order.orderId;
  const totalPcs = useMemo(() => order.items.reduce((s, it) => s + (it.qty || 0), 0), [order.items]);

  const copy = (text: string, field: 'order' | 'tracking') => {
    navigator.clipboard.writeText(text).catch(() => {});
    if (field === 'order') { setCopied(true); setTimeout(() => setCopied(false), 1500); }
    else { setCopiedTracking(true); setTimeout(() => setCopiedTracking(false), 1500); }
  };

  const tabs = [
    { k: 'recap' as const, l: 'Récapitulatif', i: FileText },
    { k: 'suivi' as const, l: 'Suivi', i: Truck },
    { k: 'delivery' as const, l: 'Livraison', i: MapPin },
    { k: 'actions' as const, l: 'Actions', i: HelpCircle },
  ];

  const breakdown = order.fees || {
    supplierCost: order.subtotal,
    serviceFeeAmount: 0,
    insuranceAmount: 0,
    totalFees: 0,
    serviceFeeSavings: 0,
    quantityDiscount: undefined,
  };

  const shippingCost = order.shipping?.totalCost || 0;
  const discountAmount = breakdown.quantityDiscount?.amount || breakdown.serviceFeeSavings || 0;

  const TabRecap = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Articles ({order.items.length})</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{totalPcs} pcs</span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {order.items.map((it, i) => (
            <div key={it.id || it._id || i} className="p-4 flex items-center gap-3">
              {it.image ? (
                <img src={it.image} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800" />
              ) : (
                <span className="h-14 w-14 rounded-lg bg-slate-100 dark:bg-slate-800 grid place-items-center"><Package size={20} className="text-slate-400" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
                {it.variant && <p className="text-[11px] text-slate-500 dark:text-slate-400">{it.variant}</p>}
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formatFcfa(it.price)} × {it.qty}</span>
                </div>
              </div>
              <p className="text-[14px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap flex-shrink-0">{formatFcfa(it.price * it.qty)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Décomposition prix</p>
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Sous-total ({totalPcs} pcs)</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatFcfa(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Frais de service</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatFcfa(breakdown.serviceFeeAmount || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Assurance import</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatFcfa(breakdown.insuranceAmount || 0)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Truck size={11} />Transport</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatFcfa(shippingCost)}</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/40 -mx-1 px-1.5 py-1">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1">Économie</span>
              <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">-{formatFcfa(discountAmount)}</span>
            </div>
          )}
        </div>
        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-extrabold text-slate-900 dark:text-white">{paid ? 'Total payé' : 'Total à payer'}</span>
          <span className="text-[24px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatFcfa(order.total)}</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{paid ? 'Payé' : 'Paiement en attente'} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
        {!paid && !isCancelled && (
          <Link
            href={`/paiement/checkout/${order.orderId}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[14px] font-extrabold text-white transition-colors hover:bg-emerald-700"
          >
            Payer maintenant
          </Link>
        )}
      </div>
    </div>
  );

  const TabSuivi = () => (
    <div className="space-y-4">
      {isCancelled ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white"><X size={18} /></span>
            <div>
              <p className="text-[14px] font-extrabold text-red-900 dark:text-red-200">{statusLabel(order.status)}</p>
              <p className="text-[11px] text-red-700 dark:text-red-300">Cette commande n&apos;est plus active. Contactez le support pour toute question.</p>
            </div>
          </div>
        </div>
      ) : (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950 text-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 backdrop-blur"><Truck size={16} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Étape {currentStep}/5</p>
            <p className="text-[15px] font-extrabold">{ORDER_STEPS[currentStep - 1]?.label || statusLabel(order.status)}</p>
          </div>
        </div>
        <p className="text-[11px] text-white/85">ETA <b>{order.delivery?.estimatedDeliveryDate || '—'}</b> · N° suivi <b className="font-mono">{tracking}</b></p>
      </div>
      )}

      {!isCancelled && (
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Historique détaillé</p>
        <div className="relative">
          {ORDER_STEPS.map((step, i) => {
            const isDone = i + 1 < currentStep;
            const isCurrent = i + 1 === currentStep;
            const isLast = i === ORDER_STEPS.length - 1;
            return (
              <div key={step.key} className="relative pl-11 pb-5 last:pb-0">
                {!isLast && (
                  <span className={cn('absolute left-[15px] top-8 bottom-0 w-0.5', isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800')} />
                )}
                <span className={cn(
                  'absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold',
                  isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                )}>
                  {isDone ? <Check size={14} /> : i + 1}
                </span>
                <div className={cn(isCurrent && 'bg-emerald-50 border border-emerald-200 -mx-2 px-2 py-2 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-900')}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('text-[13px] font-extrabold', (isDone || isCurrent) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{step.label}</p>
                  </div>
                  <p className={cn('mt-0.5 text-[11px]', (isDone || isCurrent) ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400')}>{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );

  const TabDelivery = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><MapPin size={16} /></span>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Adresse de livraison</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">{order.clientName}</p>
          <p className="text-[12px] text-slate-600 dark:text-slate-300">{order.address?.street}</p>
          {order.address?.notes && <p className="text-[12px] text-slate-600 dark:text-slate-300">{order.address.notes}</p>}
          <p className="text-[12px] text-slate-600 dark:text-slate-300 font-semibold">{[order.address?.city, order.address?.department, order.address?.region].filter(Boolean).join(', ')}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 tabular-nums"><Smartphone size={11} />{order.clientPhone}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Truck size={16} /></span>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Transporteur</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Transporteur</span>
            <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">{order.delivery?.carrier || 'DDM+ Express'}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">N° de suivi</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[13px] font-extrabold text-slate-900 dark:text-white flex-1">{tracking}</span>
              <button
                onClick={() => copy(tracking, 'tracking')}
                className={cn('rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1', copiedTracking ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')}
              >
                {copiedTracking ? <Check size={11} /> : <Copy size={11} />}{copiedTracking ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><RefreshCw size={16} /></span>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Livraison prévue</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Fenêtre estimée</p>
          </div>
        </div>
        <p className="text-[24px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{order.delivery?.estimatedDeliveryDate || '—'}</p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Vous serez notifié par SMS 1h avant la livraison.</p>
      </div>
    </div>
  );

  const TabActions = () => {
    const actions = [
      { i: MessageCircle, ttl: 'Contacter le support', sub: `${MARKET_BRAND.whatsapp} — WhatsApp`, primary: true, href: brandWhatsAppUrl(MARKET_BRAND, `Commande ${order.orderId}`) },
      { i: RefreshCw, ttl: 'Répéter la commande', sub: 'Recommander les mêmes articles', href: '#' },
      { i: Package, ttl: 'Demander un retour', sub: 'Sous 7 jours après livraison', href: `/commandes/${order.orderId}/retour${token ? `?token=${encodeURIComponent(token)}` : ''}` },
      { i: HelpCircle, ttl: 'Ouvrir un litige', sub: 'En cas de problème de livraison', href: `/suivi/${order.orderId}/litige` },
      { i: FileText, ttl: 'Télécharger la facture', sub: `PDF · ${order.orderId}.pdf`, href: `/api/order/${order.orderId}/invoice${token ? `?token=${encodeURIComponent(token)}` : ''}` },
      { i: Share2, ttl: 'Partager la commande', sub: 'Envoyer le suivi par lien', onClick: () => { navigator.share?.({ title: 'Suivi commande', text: `Suivez ma commande ${order.orderId}`, url: window.location.href }).catch(() => {}); } },
    ];
    return (
      <div className="space-y-2">
        {actions.map((a, i) => {
          const Icon = a.i;
          const inner = (
            <>
              <span className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl', a.primary ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{a.ttl}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.sub}</p>
              </div>
              <ChevronRightComp />
            </>
          );
          if (a.href && a.href.startsWith('http')) {
            return (
              <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" className={actionClass(a.primary)}>
                {inner}
              </a>
            );
          }
          if (a.href) {
            return (
              <Link key={i} href={a.href} className={actionClass(a.primary)}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={i} onClick={a.onClick} className={actionClass(a.primary)}>
              {inner}
            </button>
          );
        })}
      </div>
    );
  };

  const actionClass = (primary?: boolean) => cn(
    'flex w-full items-center gap-3 rounded-2xl border p-4 text-left hover:shadow-sm transition-all',
    primary ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
  );

  const ChevronRightComp = () => (
    <svg className="flex-shrink-0 text-slate-400" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sticky top-0 z-20">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
              <ArrowLeft size={16} /> Retour
            </button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] font-extrabold text-slate-900 dark:text-white">Commande {order.orderId}</h1>
                <button onClick={() => copy(order.orderId, 'order')} className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1', copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300')}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Commandée le {new Date(order.createdAt).toLocaleDateString('fr-FR')} · Livraison prévue {order.delivery?.estimatedDeliveryDate || '—'}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{paid ? 'Total payé' : 'Total à payer'}</p>
              <p className="text-[22px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatFcfa(order.total)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {!paid && !isCancelled && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-amber-500 text-white"><Smartphone size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-amber-900 dark:text-amber-200">Paiement en attente</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Finalisez le paiement pour lancer le traitement de votre commande.</p>
              </div>
              <Link
                href={`/paiement/checkout/${order.orderId}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                className="flex-shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-[13px] font-extrabold text-white transition-colors hover:bg-amber-700"
              >
                Payer
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_BADGE_CLASSES[statusTone(order.status)] || STATUS_BADGE_CLASSES.slate)}>
            {statusLabel(order.status)}
          </span>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">N° suivi {tracking}</p>
        </div>

        <div className={cn('rounded-xl bg-slate-100 dark:bg-slate-800 p-1 flex', 'overflow-x-auto')}> 
          {tabs.map((t) => {
            const Icon = t.i;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-[12px] font-bold whitespace-nowrap transition min-w-[100px]',
                  tab === t.k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                <Icon size={14} /> {t.l}
              </button>
            );
          })}
        </div>

        {tab === 'recap' && <TabRecap />}
        {tab === 'suivi' && <TabSuivi />}
        {tab === 'delivery' && <TabDelivery />}
        {tab === 'actions' && <TabActions />}
      </main>

      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-6 md:right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-700"
      >
        <MessageCircle size={22} />
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setChatOpen(false)}>
          <div
            className={cn(
              'absolute overflow-hidden bg-white dark:bg-slate-950',
              'bottom-0 left-0 right-0 max-h-[85%] rounded-t-3xl md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-[400px] md:rounded-2xl md:max-h-none'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MessageCircle size={16} /></span>
                  <div>
                    <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Chat support</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />En ligne</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <OrderChat orderReference={order.orderId} token={token} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
