'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { mapOrder } from '../data-mappers';
import type { Order, OrderStep, OrderStatus } from '../types';


interface PublicTracking {
  orderId: string
  status: string
  statusUi: string
  statusLabel: string
  step: number
  paid: boolean
  createdAt?: string
  itemCount: number
  eta?: string | null
  carrier?: string | null
  trackingNumber?: string | null
}

export default function ScreenTracking() {
  const [loading, setLoading] = useState(true);
  const [ORDERS, setORDERS] = useState<Order[]>([]);
  const [ORDER_STEPS, setORDER_STEPS] = useState<OrderStep[]>([]);
  const [publicInfo, setPublicInfo] = useState<PublicTracking | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const params = useParams();
  const searchParams = useSearchParams();
  const reference = params?.reference as string;
  const token = searchParams?.get('token') || searchParams?.get('t') || '';

  useEffect(() => {
    if (!reference) return;
    setLoading(true);
    const orderUrl = `/api/order/${encodeURIComponent(reference)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    fetch(orderUrl, { credentials: 'include' })
      .then(async r => {
        if (r.ok) return r.json();
        // Pas de session ni de token : vue publique masquée si la commande existe
        const pub = await fetch(`/api/order/track-public?ref=${encodeURIComponent(reference)}`)
          .then(pr => (pr.ok ? pr.json() : null))
          .catch(() => null);
        if (pub?.order) {
          setPublicInfo(pub.order as PublicTracking);
          setUnauthorized(true);
        }
        return null;
      })
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
  }, [reference, token]);


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

  // Vue publique masquée : la commande existe mais le détail exige le lien de suivi
  if (unauthorized && publicInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Icon name="truck" size={26}/>
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{publicInfo.orderId}</p>
          <h1 className="mt-1 text-[20px] font-extrabold text-slate-900 dark:text-white">{publicInfo.statusLabel}</h1>
          {publicInfo.step > 0 && (
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Étape {publicInfo.step}/5 · {publicInfo.itemCount} article{publicInfo.itemCount > 1 ? 's' : ''}</p>
          )}
          {publicInfo.eta && (
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Livraison prévue : <b className="text-emerald-600 dark:text-emerald-400">{new Date(publicInfo.eta).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</b>
            </p>
          )}
          {publicInfo.trackingNumber && (
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">N° transporteur : {publicInfo.trackingNumber}</p>
          )}
          <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-[11px] text-slate-500 dark:text-slate-400">
            Pour le détail complet (articles, montant, adresse), utilisez le lien de suivi reçu par email ou connectez-vous.
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/retrouver-ma-commande" className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-700">
              Retrouver mon lien de suivi
            </Link>
            <Link href={`/login?redirect=${encodeURIComponent(`/suivi/${reference}`)}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Se connecter
            </Link>
          </div>
        </Card>
      </div>
    );
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

  const DeliveryCard = () => (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <Icon name="truck" size={20}/>
        </span>
        <div>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Transport</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{order.shipping}</p>
        </div>
      </div>
      <div className="space-y-2.5 text-[12px]">
        <div className="flex items-baseline justify-between">
          <span className="text-slate-500 dark:text-slate-400">Itinéraire</span>
          <span className="font-semibold text-slate-900 dark:text-white">Guangzhou → Dakar</span>
        </div>
        {order.tracking ? (
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 dark:text-slate-400">N° transporteur</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{order.tracking}</span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 dark:text-slate-400">N° transporteur</span>
            <span className="text-slate-400 dark:text-slate-500">Attribué à l'expédition</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-slate-500 dark:text-slate-400">Livraison prévue</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{order.eta}</span>
        </div>
      </div>
    </Card>
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
            <DeliveryCard/>
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
            <DeliveryCard/>

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
