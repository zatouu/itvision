'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { mapOrder } from '../data-mappers';
import { isPaymentSettled } from '@/lib/order-status';
import { MARKET_BRAND, brandWhatsAppUrl } from '@/lib/branding';
import type { Order, OrderStep } from '../types';


export default function ScreenOrders() {
  const [loading, setLoading] = useState(true);
  const [ORDERS, setORDERS] = useState<Order[]>([]);
  const [ORDER_STEPS, setORDER_STEPS] = useState<OrderStep[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/account/dashboard', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (Array.isArray(d?.dashboard?.orders)) {
          setORDERS(d.dashboard.orders.map((o: any) => mapOrder(o) as Order));
        } else if (d?.dashboard?.latestOrder) {
          setORDERS([mapOrder(d.dashboard.latestOrder) as Order]);
        }
        if (d?.dashboard?.orderSteps) {
          setORDER_STEPS(d.dashboard.orderSteps as OrderStep[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const steps: OrderStep[] = ORDER_STEPS.length ? ORDER_STEPS : [
    { key: 'ordered', label: 'Commande confirmée', desc: 'Paiement validé' },
    { key: 'sourcing', label: 'Sourcing en Chine', desc: 'Recherche du fournisseur' },
    { key: 'china', label: 'Inspection qualité', desc: 'Contrôle qualité en Chine' },
    { key: 'in_transit', label: 'En transit', desc: 'Transport international' },
    { key: 'delivered', label: 'Livrée', desc: 'Livraison à l\'adresse' },
  ];


  const [tab, setTab] = useState("all");

  const tabs = [
    { k: "all", l: "Toutes", count: ORDERS.length },
    { k: "in_progress", l: "En cours", count: ORDERS.filter(o => o.status !== "delivered" && o.status !== "cancelled").length },
    { k: "delivered", l: "Livrées", count: ORDERS.filter(o => o.status === "delivered").length },
  ];

  const filtered = ORDERS.filter(o => {
    if (tab === "all") return true;
    if (tab === "in_progress") return o.status !== "delivered" && o.status !== "cancelled";
    if (tab === "delivered") return o.status === "delivered";
    return true;
  });

  const statusMap: Record<string, { label: string; tone: string; icon: string }> = {
    ordered:   { label: "Confirmée",       tone: "blue",    icon: "check" },
    sourcing:  { label: "Sourcing",        tone: "violet",  icon: "camera" },
    china:     { label: "Inspection Chine",tone: "amber",   icon: "shield" },
    in_transit:{ label: "En transit",      tone: "blue",    icon: "truck" },
    transit:   { label: "En transit",      tone: "blue",    icon: "truck" },
    delivered: { label: "Livrée",          tone: "emerald", icon: "checkCircle" },
    cancelled: { label: "Annulée",         tone: "red",     icon: "x" },
  };

  const OrderCard = ({ o }: { o: Order }) => {
    const s = statusMap[o.status] || statusMap.ordered;
    const totalPcs = o.items.reduce((sum, it) => sum + it.qty, 0);
    const unpaid = !isPaymentSettled(o.paymentStatus) && o.status !== 'cancelled';
    const orderHref = `/commandes/${o.id}`;
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{o.id}</p>
            <span className="text-[10px] text-slate-400">·</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
          </div>
          <Badge tone={s.tone}><Icon name={s.icon} size={11}/>{s.label}</Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {o.items.slice(0, 3).map((it, i) => (
                <span key={i} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 border-white dark:border-slate-900">
                  <Image src={it.image} alt={it.name} fill sizes="48px" className="object-cover" />
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{o.items[0]?.name}</p>
              {o.items[0]?.variantLabels && o.items[0].variantLabels.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{o.items[0].variantLabels.join(' · ')}</p>
              )}
              {o.items.length > 1 && <p className="text-[11px] text-slate-500 dark:text-slate-400">+ {o.items.length - 1} autre{o.items.length > 2 ? "s" : ""} article{o.items.length > 2 ? "s" : ""}</p>}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalPcs} pcs · {o.shipping}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatFcfa(o.total)}</p>
            </div>
          </div>

          {/* Mini timeline */}
          {o.status !== "delivered" && o.status !== "cancelled" && steps.length > 0 && (
            <div className="mb-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
              <div className="flex items-center gap-1 mb-1.5">
                {steps.map((step, i) => (
                  <Fragment key={step.key}>
                    <span className={cn(
                      "grid h-4 w-4 flex-shrink-0 place-items-center rounded-full text-[8px] font-bold",
                      i + 1 < o.currentStep ? "bg-emerald-500 text-white" : i + 1 === o.currentStep ? "bg-emerald-500 text-white ring-2 ring-emerald-500/30" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    )}>
                      {i + 1 < o.currentStep ? <Icon name="check" size={8}/> : i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={cn("h-0.5 flex-1", i + 1 < o.currentStep ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")}/>
                    )}
                  </Fragment>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">{steps[o.currentStep - 1]?.label}</p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">ETA · <b className="text-slate-900 dark:text-white">{o.eta}</b></p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {unpaid && (
              <Link href={`/paiement/checkout/${o.id}`}>
                <Button variant="primary" size="sm"><Icon name="wallet" size={12}/>Payer</Button>
              </Link>
            )}
            {!unpaid && o.status !== "delivered" && o.status !== "cancelled" && (
              <Link href={orderHref}>
                <Button variant="primary" size="sm"><Icon name="truck" size={12}/>Suivre</Button>
              </Link>
            )}
            <Link href={orderHref}>
              <Button variant="secondary" size="sm">Détails</Button>
            </Link>
            {o.status === "delivered" && (
              <Link href={orderHref}>
                <Button variant="secondary" size="sm">Réévaluer</Button>
              </Link>
            )}
            <a href={brandWhatsAppUrl(MARKET_BRAND, `Commande ${o.id}`)} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm"><Icon name="whatsapp" size={12}/>Contacter</Button>
            </a>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  return (
    <div className="min-h-full bg-slate-50 pb-20 dark:bg-slate-950 md:pb-0">
      <div className="mx-auto max-w-6xl md:px-6 md:py-6">
        {/* Fil d'ariane + titre — desktop */}
        <div className="mb-6 hidden md:block">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/market" className="cursor-pointer">Accueil</Link><Icon name="chevronRight" size={12}/><Link href="/compte" className="cursor-pointer">Mon compte</Link><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">Mes commandes</span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">Mes commandes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{ORDERS.length}</b> commandes au total</p>
        </div>

        {/* Onglets — sticky sous le header sur mobile */}
        <div className="sticky top-[var(--mkt-header-h,0px)] z-20 border-b border-slate-200 bg-slate-50 px-4 pt-3 dark:border-slate-800 dark:bg-slate-950 md:static md:border-0 md:bg-transparent md:px-0 md:pt-0 md:dark:bg-transparent">
          <div className="mb-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800 md:mb-4">
            {tabs.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-bold transition-colors md:px-4 md:text-[13px]",
                tab === t.k ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-400"
              )}>
                {t.l} <span className="ml-1 tabular-nums text-[11px] opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mx-4 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900 md:mx-0 md:p-16">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4 md:h-24 md:w-24">
              <Icon name="package" size={32} className="text-slate-400"/>
            </div>
            <p className="text-[14px] font-extrabold text-slate-900 dark:text-white md:text-[16px]">Aucune commande</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 md:text-sm">Vos commandes apparaîtront ici.</p>
            <Link href="/produits"><Button variant="primary" size="md" className="mt-4 md:mt-6">Explorer le catalogue</Button></Link>
          </div>
        ) : (
          <div className="space-y-3 p-4 md:p-0">
            {filtered.map((o) => <OrderCard key={o.id} o={o}/>)}
          </div>
        )}
      </div>
    </div>
  );

}
