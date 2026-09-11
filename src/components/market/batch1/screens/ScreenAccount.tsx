'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { mapOrder, mapUser } from '../data-mappers';
import type { Order, User, OrderStep } from '../types';


export default function ScreenAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ORDERS, setORDERS] = useState<Order[]>([]);
  const [USER, setUSER] = useState<User | null>(null);
  const [ORDER_STEPS, setORDER_STEPS] = useState<OrderStep[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/users/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/account/dashboard', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userRes, dashRes]) => {
      if (userRes?.user || dashRes?.dashboard?.user) {
        setUSER(mapUser(userRes?.user, dashRes?.dashboard) as User);
      }
      if (dashRes?.dashboard?.latestOrder) {
        setORDERS([mapOrder(dashRes.dashboard.latestOrder) as Order]);
      }
      if (dashRes?.dashboard?.orderSteps) {
        setORDER_STEPS(dashRes.dashboard.orderSteps as OrderStep[]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);


  const activeOrder = ORDERS[0];
  const currentStep = activeOrder?.currentStep ?? 1;

  const supportWhatsApp = "https://wa.me/221774133440?text=" + encodeURIComponent("Bonjour DDM+, j'ai une question sur mon compte.");

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    router.push('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (!USER) {
    if (typeof window !== 'undefined') {
      router.push('/login?redirect=/compte');
    }
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Redirection…</div>;
  }

  const Stats = () => (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commandes</p>
        <p className="mt-1 text-[22px] font-extrabold tabular-nums text-slate-900 dark:text-white">{USER.stats.orders}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Cette année</p>
      </Card>
      <Card className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Groupes</p>
        <p className="mt-1 text-[22px] font-extrabold tabular-nums text-violet-700 dark:text-violet-300">{USER.stats.groups}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Rejoints</p>
      </Card>
      <Card className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Économies</p>
        <p className="mt-1 text-[16px] md:text-[18px] font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatFcfa(USER.stats.savings)}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Cumulées</p>
      </Card>
    </div>
  );

  const ActiveOrder = () => {
    if (!activeOrder) return null;
    const totalQty = activeOrder.items.reduce((s, it) => s + it.qty, 0);
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prochaine livraison</p>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Commande {activeOrder.id}</p>
          </div>
          <Badge tone="blue"><Icon name="truck" size={11}/>En transit</Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {activeOrder.items.slice(0, 3).map((it, i) => (
                <span key={i} className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 border-white dark:border-slate-900">
                  <Image src={it.image} alt={it.name} fill sizes="40px" className="object-cover" />
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-1">{activeOrder.items[0]?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalQty} pcs · {activeOrder.shipping}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">ETA</p>
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white whitespace-nowrap">{activeOrder.eta}</p>
            </div>
          </div>

          {ORDER_STEPS.length > 0 && (
            <>
              <div className="flex items-center gap-1 mb-2">
                {ORDER_STEPS.map((s, i) => (
                  <Fragment key={s.key}>
                    <span className={cn(
                      "grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[9px] font-bold",
                      i + 1 < currentStep ? "bg-emerald-500 text-white" : i + 1 === currentStep ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {i + 1 < currentStep ? <Icon name="check" size={11}/> : i + 1}
                    </span>
                    {i < ORDER_STEPS.length - 1 && (
                      <span className={cn("h-0.5 flex-1", i + 1 < currentStep ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")}/>
                    )}
                  </Fragment>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">{ORDER_STEPS[currentStep - 1]?.label}</p>
                <Link href="/compte/commandes" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">Suivre →</Link>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  const Grains = () => {
    const pct = (USER.grains / USER.nextTierAt) * 100;
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Programme Grains</p>
              <p className="mt-1 text-[24px] font-extrabold tabular-nums">{USER.grains.toLocaleString('fr-FR')} <span className="text-[13px] font-bold text-white/70">grains</span></p>
              <p className="text-[11px] text-white/85">Palier <b>{USER.grainsTier}</b></p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Icon name="sparkles" size={20}/>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{width: pct + "%"}}/>
            </div>
            <p className="mt-1 text-[10px] text-white/85 tabular-nums">Encore <b>{(USER.nextTierAt - USER.grains).toLocaleString('fr-FR')}</b> grains pour le palier Platinum</p>
          </div>
        </div>
        <button className="w-full py-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Utiliser mes grains →</button>
      </Card>
    );
  };

  const WhatsAppCard = () => (
    <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
          <Icon name="whatsapp" size={20}/>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Support WhatsApp</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">7j/7 · Réponse sous 15 min</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="!bg-emerald-600 flex-shrink-0"
          onClick={() => window.open(supportWhatsApp, '_blank', 'noopener,noreferrer')}
        >
          Discuter
        </Button>
      </div>
    </Card>
  );

  const shortcuts = [
    { key: "orders", label: "Mes commandes", icon: "package", sub: USER.stats.orders + " au total", href: "/compte/commandes" },
    { key: "groups", label: "Mes groupes", icon: "users", sub: USER.stats.groups + " actifs", href: "/compte/achats-groupes" },
    { key: "favorites", label: "Favoris", icon: "heart", sub: `${USER.favorites?.length ?? 0} produit${(USER.favorites?.length ?? 0) > 1 ? 's' : ''}`, href: "/produits/favoris" },
    { key: "addresses", label: "Mes adresses", icon: "mapPin", sub: "Mes adresses", href: "/compte/profil" },
    { key: "sourcing", label: "Mes demandes sourcing", icon: "camera", sub: "Mes demandes", href: "/market" },
    { key: "payment", label: "Modes de paiement", icon: "wallet", sub: "Mobile Money", href: "/compte/profil" },
  ];

  const Shortcuts = () => (
    <div className={cn("grid gap-2", "grid-cols-2 md:grid-cols-3")}>
      {shortcuts.map((s) => (
        <Link key={s.key} href={s.href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Icon name={s.icon} size={16}/>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{s.label}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{s.sub}</p>
          </div>
          <Icon name="chevronRight" size={14} className="flex-shrink-0 text-slate-400"/>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Header profile */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 px-4 pt-6 pb-8 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[16px] font-extrabold text-white">
                CA
              </span>
              <div>
                <p className="text-[16px] font-extrabold">{USER.handle}</p>
                <p className="text-[11px] text-white/70">Membre depuis {USER.memberSince}</p>
              </div>
              <button className="ml-auto grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20">
                <Icon name="bell" size={16}/>
              </button>
            </div>
          </div>

          <div className="-mt-4 px-4 space-y-4">
            <Stats/>
            <ActiveOrder/>
            <Grains/>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Raccourcis</p>
              <Shortcuts/>
            </div>
            <WhatsAppCard/>

            <div className="pt-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compte</p>
              <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  { icon: "user", label: "Informations personnelles" },
                  { icon: "lock", label: "Sécurité" },
                  { icon: "bell", label: "Notifications" },
                  { icon: "info", label: "Aide et FAQ" },
                ].map((it) => (
                  <button key={it.label} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Icon name={it.icon} size={16} className="text-slate-500 dark:text-slate-400"/>
                    <span className="flex-1 text-[13px] font-semibold text-slate-900 dark:text-white">{it.label}</span>
                    <Icon name="chevronRight" size={14} className="text-slate-400"/>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full py-3 text-[13px] font-bold text-red-600 dark:text-red-400 disabled:opacity-50"
            >
              {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </div>
        </div>

      </div>
    );

      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mon compte</p>
            <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">Bonjour, {USER.handle}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Membre depuis {USER.memberSince}</p>
          </div>
          <div className="flex gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"><Icon name="bell" size={16}/></button>
            <Button variant="secondary" size="md">Paramètres</Button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Main col */}
          <div className="space-y-6">
            <Stats/>
            <ActiveOrder/>
            <div>
              <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">Raccourcis</h3>
              <Shortcuts/>
            </div>

            <div>
              <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">Activité récente</h3>
              <Card className="divide-y divide-slate-200 dark:divide-slate-800">
                {(USER.activities ?? []).length === 0 ? (
                  <div className="p-4 text-[13px] text-slate-500 dark:text-slate-400">Aucune activité récente.</div>
                ) : (
                  USER.activities!.map((a, i) => {
                    const typeConfig: Record<string, { icon: string; tone: string }> = {
                      order: { icon: 'package', tone: 'emerald' },
                      group: { icon: 'users', tone: 'violet' },
                      group_order: { icon: 'users', tone: 'violet' },
                      grains: { icon: 'sparkles', tone: 'amber' },
                      reward: { icon: 'sparkles', tone: 'amber' },
                      sourcing: { icon: 'camera', tone: 'violet' },
                      default: { icon: 'info', tone: 'slate' },
                    };
                    const cfg = typeConfig[a.type] || typeConfig.default;
                    const toneMap: Record<string, string> = {
                      emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                      violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
                      amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                      slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                    };
                    const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
                    const right = a.amount ? `${a.amount}${a.unit ? ` ${a.unit}` : ''}` : '';
                    return (
                      <div key={a.id || i} className="flex items-center gap-3 p-4">
                        <span className={cn("grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg", toneMap[cfg.tone])}><Icon name={cfg.icon} size={16}/></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{a.description}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{date}</p>
                        </div>
                        {right && <p className="text-[13px] font-extrabold tabular-nums text-slate-900 dark:text-white flex-shrink-0 whitespace-nowrap">{right}</p>}
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </div>

          {/* Sidebar right */}
          <div className="space-y-4">
            <Grains/>
            <WhatsAppCard/>

            <Card className="p-4">
              <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white mb-3">Compte</h4>
              <div className="space-y-1">
                {[
                  { icon: "user", label: "Informations personnelles" },
                  { icon: "lock", label: "Sécurité" },
                  { icon: "bell", label: "Notifications" },
                  { icon: "info", label: "Aide et FAQ" },
                ].map((it) => (
                  <button key={it.label} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Icon name={it.icon} size={14} className="text-slate-500 dark:text-slate-400"/>
                    <span className="flex-1 text-[12px] font-semibold text-slate-700 dark:text-slate-300">{it.label}</span>
                    <Icon name="chevronRight" size={12} className="text-slate-400"/>
                  </button>
                ))}
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-3 w-full py-2 text-[12px] font-bold text-red-600 dark:text-red-400 border-t border-slate-200 dark:border-slate-800 pt-3 disabled:opacity-50"
              >
                {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
