'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { mapOrder } from '../data-mappers';
import type { Order, OrderStep, OrderStatus } from '../types';


export default function ScreenTracking() {
  const [loading, setLoading] = useState(true);
  const [ORDERS, setORDERS] = useState<Order[]>([]);
  const [ORDER_STEPS, setORDER_STEPS] = useState<OrderStep[]>([]);

  const params = useParams();
  const reference = params?.reference as string;
  useEffect(() => {
    if (!reference) return;
    setLoading(true);
    fetch(`/api/order/${reference}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.order) {
          setORDERS([mapOrder(data.order) as Order]);
        }
        if (data?.orderSteps) {
          setORDER_STEPS(data.orderSteps as OrderStep[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reference]);


  const order = ORDERS[0];
  const currentStep = order?.currentStep ?? 1;
  const totalPcs = order?.items.reduce((s, it) => s + it.qty, 0) ?? 0;

  const steps: OrderStep[] = ORDER_STEPS.length ? ORDER_STEPS : [
    { key: 'ordered', label: 'Commande confirmée', desc: 'Paiement validé' },
    { key: 'sourcing', label: 'Sourcing en Chine', desc: 'Recherche du fournisseur' },
    { key: 'china', label: 'Inspection qualité', desc: 'Contrôle qualité en Chine' },
    { key: 'in_transit', label: 'En transit', desc: 'Transport international' },
    { key: 'delivered', label: 'Livrée', desc: 'Livraison à l\'adresse' },
  ];

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (!order) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Commande introuvable</div>;
  }

  const statusConfig: Record<OrderStatus, { label: string; tone: 'emerald' | 'blue' | 'violet' | 'amber' | 'red' | 'slate'; icon: string }> = {
    ordered: { label: 'Commandée', tone: 'blue', icon: 'check' },
    sourcing: { label: 'Sourcing', tone: 'violet', icon: 'camera' },
    china: { label: 'Inspection Chine', tone: 'amber', icon: 'shield' },
    in_transit: { label: 'En transit', tone: 'emerald', icon: 'truck' },
    transit: { label: 'En transit', tone: 'emerald', icon: 'truck' },
    delivered: { label: 'Livrée', tone: 'emerald', icon: 'checkCircle' },
    cancelled: { label: 'Annulée', tone: 'red', icon: 'x' },
  };

  const cfg = statusConfig[order.status] || statusConfig.ordered;

  const stepDates = steps.length
    ? steps.map((_, i) => {
        const orderDate = order.date ? new Date(order.date) : new Date();
        const eta = order.eta && order.eta !== '—' ? new Date(order.eta) : null;
        if (i === 0) {
          return { date: orderDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), desc: 'Paiement confirmé' };
        }
        if (i === steps.length - 1) {
          return { date: eta ? eta.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—', desc: 'Livraison prévue' };
        }
        const offsetDays = [0, 1, 2, 4, 7][i] ?? i;
        const d = new Date(orderDate);
        d.setDate(d.getDate() + offsetDays);
        return { date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), desc: steps[i]?.desc || 'Mise à jour' };
      })
    : [];

  const supportWhatsApp = "https://wa.me/221774133440?text=" + encodeURIComponent(`Bonjour DDM+, j'ai une question sur ma commande ${order.id} (n° de suivi ${order.tracking || order.id}).`);

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.tracking || order.id);
    } catch {
      /* ignore */
    }
  };

  
  const Timeline = () => (
    <div className="relative">
      {steps.map((step, i) => {
        const isDone = i + 1 < currentStep;
        const isCurrent = i + 1 === currentStep;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="relative pl-11 pb-5">
            {!isLast && (
              <span className={cn(
                "absolute left-[15px] top-8 bottom-0 w-0.5",
                isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
              )}/>
            )}
            <span className={cn(
              "absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold",
              isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 animate-ping-slow" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {isDone ? <Icon name="check" size={14}/> : i + 1}
            </span>
            <div className={cn(isCurrent && "bg-emerald-50 border border-emerald-200 -mx-2 px-2 py-2 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-900")}>
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn("text-[13px] font-extrabold", isDone || isCurrent ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>
                  {step.label}
                </p>
                <p className={cn("text-[10px] font-semibold whitespace-nowrap flex-shrink-0", isDone || isCurrent ? "text-slate-500 dark:text-slate-400" : "text-slate-400")}>
                  {stepDates[i]?.date}
                </p>
              </div>
              <p className={cn("mt-0.5 text-[11px]", isDone || isCurrent ? "text-slate-600 dark:text-slate-300" : "text-slate-400")}>
                {isCurrent ? stepDates[i].desc : (isDone ? stepDates[i].desc : step.desc)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const MapPlaceholder = () => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 h-56 md:h-72 bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 dark:from-blue-950/30 dark:via-slate-900 dark:to-emerald-950/30">
      {/* Trajectoire */}
      <svg viewBox="0 0 400 220" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669"/>
            <stop offset="100%" stopColor="#2563eb"/>
          </linearGradient>
        </defs>
        {/* dots pattern */}
        {Array.from({length: 30}).map((_, i) => (
          <circle key={i} cx={20 + (i * 13) % 360} cy={30 + Math.sin(i) * 20 + (i % 5) * 30} r="1" fill="#94a3b8" opacity="0.3"/>
        ))}
        {/* path */}
        <path d="M 60 60 Q 200 30 340 160" stroke="url(#pathGrad)" strokeWidth="3" strokeDasharray="4 4" fill="none"/>
        {/* origin marker */}
        <circle cx="60" cy="60" r="10" fill="#2563eb" opacity="0.2"/>
        <circle cx="60" cy="60" r="5" fill="#2563eb"/>
        <text x="60" y="45" textAnchor="middle" fontSize="8" fontWeight="700" fill="#2563eb">GUANGZHOU</text>
        {/* current marker (plane between origin and dest, ~60%) */}
        <g transform="translate(240, 90)">
          <circle r="12" fill="#059669" opacity="0.25"/>
          <circle r="12" fill="#059669" opacity="0.4">
            <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle r="6" fill="#059669"/>
          <text y="-16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#059669">EN VOL</text>
        </g>
        {/* destination */}
        <circle cx="340" cy="160" r="10" fill="#F59E0B" opacity="0.2"/>
        <circle cx="340" cy="160" r="5" fill="#F59E0B"/>
        <text x="340" y="182" textAnchor="middle" fontSize="8" fontWeight="700" fill="#B45309">DAKAR</text>
      </svg>
      <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 backdrop-blur px-2.5 py-1.5 shadow-sm dark:bg-slate-900/95">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Distance parcourue</p>
        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">~8 200 / 12 800 km</p>
      </div>
      <div className="absolute top-3 right-3 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping-slow"/>Mise à jour temps réel
      </div>
    </div>
  );

  const OrderInfo = () => (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex -space-x-2">
          {order.items.slice(0, 3).map((it, i) => (
            <span key={i} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 border-white dark:border-slate-900">
              <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{order.items[0].name}</p>
          {order.items.length > 1 && <p className="text-[11px] text-slate-500 dark:text-slate-400">+ {order.items.length - 1} article{order.items.length > 2 ? "s" : ""}</p>}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalPcs} pcs · {order.shipping}</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">N° de suivi</span>
          <span className="font-mono text-[12px] font-bold text-slate-900 dark:text-white">{order.tracking}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Livraison prévue</span>
          <span className="text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400">{order.eta}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total payé</span>
          <span className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(order.total)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={copyTracking}><Icon name="copy" size={12}/>Copier N°</Button>
        <Button
          variant="primary"
          size="sm"
          className="!bg-emerald-600 flex-1"
          onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')}
        >
          <Icon name="whatsapp" size={12}/>WhatsApp
        </Button>
      </div>
    </Card>
  );

  return (
    <Fragment>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-6">
          {/* Status banner */}
          <div className={cn("px-4 py-4 text-white", cfg.tone === 'red' ? "bg-gradient-to-br from-red-600 to-red-700 dark:from-red-800 dark:to-red-950" : "bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950")}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur"><Icon name={cfg.icon} size={16}/></span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Étape {currentStep}/{steps.length || 5}</p>
                <p className="text-[15px] font-extrabold">{steps[currentStep - 1]?.label ?? ""}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold">
                <span className={cn("h-1.5 w-1.5 rounded-full animate-ping-slow", cfg.tone === 'red' ? "bg-red-300" : "bg-emerald-300")}/>{cfg.label}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <MapPlaceholder/>
            <OrderInfo/>

            <Card className="p-4">
              <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white mb-4">Historique</h3>
              <Timeline/>
            </Card>

            {/* Contact */}
            <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                  <Icon name="whatsapp" size={20}/>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Une question ?</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Notre équipe suit votre commande 7j/7</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="!bg-emerald-600 flex-shrink-0"
                  onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')}
                >
                  Contacter
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/market" className="cursor-pointer">Accueil</Link><Icon name="chevronRight" size={12}/><Link href="/compte/commandes" className="cursor-pointer">Mes commandes</Link><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">{order.id}</span>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Suivi de commande</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Commande <b className="text-slate-900 dark:text-white">{order.id}</b> · Passée le {new Date(order.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={cfg.tone}><Icon name={cfg.icon} size={12}/>{cfg.label} · Étape {currentStep}/{steps.length || 5}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <MapPlaceholder/>

            <Card className="p-6">
              <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-5">Historique détaillé</h3>
              <Timeline/>
            </Card>
          </div>

          <div className="space-y-4">
            <OrderInfo/>

            <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                  <Icon name="whatsapp" size={20}/>
                </span>
                <div>
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Support 7j/7</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Réponse sous 15 min</p>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                className="!bg-emerald-600 w-full mt-3"
                onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')}
              >
                <Icon name="whatsapp" size={14}/>Contacter le support
              </Button>
            </Card>

            <Card className="p-4">
              <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white mb-2">Actions</h4>
              <div className="space-y-1.5">
                <button onClick={copyTracking} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Icon name="copy" size={14}/>Copier le n° de suivi
                </button>
                <button onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Icon name="mapPin" size={14}/>Modifier l&apos;adresse (contact)
                </button>
                <button onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Icon name="info" size={14}/>Facture (contact)
                </button>
                <button onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
                  <Icon name="x" size={14}/>Signaler un problème
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</Fragment>
  );

}
