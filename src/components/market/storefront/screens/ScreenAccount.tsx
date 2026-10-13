'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, LogOut, Package, Users, Heart, Gift, Store, MapPin, ShieldCheck, UserRound, MessageCircle, Coins } from 'lucide-react';
import { formatFcfa } from '../formatFcfa';
import { brandWhatsAppUrl } from '@/lib/branding';
import { isPaymentSettled } from '@/lib/order-status';
import { mapOrder, mapUser } from '../data-mappers';
import { SourcingRequestsCard } from '../SourcingRequestsCard';
import type { Order, User } from '../types';

const orderLabels: Record<string, string> = {
  ordered: 'Confirmée', sourcing: 'En préparation', china: 'Contrôle qualité',
  in_transit: 'En transit', transit: 'En transit', delivered: 'Livrée', cancelled: 'Annulée',
};
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800';

export default function ScreenAccount() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const response = await fetch('/api/account/dashboard', { credentials: 'include', signal: controller.signal });
        if (response.status === 401) {
          router.replace('/login?redirect=/compte');
          return;
        }
        if (!response.ok) throw new Error('Votre compte est temporairement indisponible. Réessayez dans un instant.');
        const { dashboard } = await response.json();
        if (!dashboard?.user || !dashboard.stats || !dashboard.grains) throw new Error('Les informations du compte sont incomplètes. Veuillez réessayer.');
        if (controller.signal.aborted) return;
        setUser(mapUser({ ...dashboard.user, name: [dashboard.user.firstName, dashboard.user.lastName].filter(Boolean).join(' ') }, dashboard));
        setOrders((dashboard.orders?.length ? dashboard.orders : dashboard.latestOrder ? [dashboard.latestOrder] : []).map(mapOrder));
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Impossible de charger votre compte.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, router]);

  async function logout() {
    setLoggingOut(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok && response.status !== 401) throw new Error();
      router.replace('/login');
    } catch {
      setError('La déconnexion a échoué. Votre session reste ouverte. Réessayez.');
    } finally {
      setLoggingOut(false);
    }
  }

  const order = orders.find(item => !['delivered', 'cancelled'].includes(item.status)) || orders[0];
  const unpaid = order && !isPaymentSettled(order.paymentStatus) && !['cancelled', 'delivered'].includes(order.status);
  const links = [
    { label: 'Commandes et paiements', href: '/compte/commandes', icon: Package },
    { label: 'Achats groupés', href: '/compte/achats-groupes', icon: Users },
    { label: 'Favoris', href: '/produits/favoris', icon: Heart },
    { label: 'Rattacher une commande invitée', href: '/compte/reclamer-commande', icon: Package },
  ];
  const settings = [
    { label: 'Informations personnelles', href: '/compte/profil#identite', icon: UserRound },
    { label: 'Adresses de livraison', href: '/compte/profil#adresses', icon: MapPin },
    { label: 'Sécurité du compte', href: '/compte/profil#securite', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 md:pb-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">Mon compte</h1>
            {user && <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">Bonjour, {user.handle}</p>}
          </div>
          <Link href="/compte/profil#identite" className={actionClass}><UserRound size={18} aria-hidden="true"/>Mon profil</Link>
        </header>

        {error && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <p className="min-w-0 flex-1">{error}</p>
          <button onClick={() => setAttempt(value => value + 1)} className={actionClass}><RefreshCw size={16} aria-hidden="true"/>Réessayer</button>
        </div>}
        {loading ? <p role="status" className="py-12 text-sm text-zinc-600 dark:text-zinc-400">Chargement de votre compte…</p> : user && (
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-8">
              <section aria-label="Résumé de vos achats">
                <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:grid-cols-3">
                  <div><dt className="text-sm text-zinc-600 dark:text-zinc-400">Commandes au total</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{user.stats.orders}</dd></div>
                  <div><dt className="text-sm text-zinc-600 dark:text-zinc-400">Groupes en cours</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{user.stats.groups}</dd></div>
                  <div className="col-span-2 min-w-0 sm:col-span-1"><dt className="text-sm text-zinc-600 dark:text-zinc-400">Économies cumulées</dt><dd className="mt-1 break-words text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatFcfa(user.stats.savings)}</dd></div>
                </dl>
              </section>

              <section aria-labelledby="account-orders">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="account-orders" className="text-lg font-bold">{order && !['delivered', 'cancelled'].includes(order.status) ? 'Commande à suivre' : 'Dernière commande'}</h2>
                  <Link href="/compte/commandes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Tout voir<ArrowRight size={16} aria-hidden="true"/></Link>
                </div>
                {order ? <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all text-sm font-semibold">{order.id}</p>
                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{unpaid ? 'En attente de paiement' : orderLabels[order.status] || 'En cours'}</span>
                  </div>
                  <div className="my-4 flex items-center gap-3">
                    {order.items[0] && <Image src={order.items[0].image} width={64} height={64} alt={order.items[0].name} className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100 object-cover"/>}
                    <div className="min-w-0"><p className="break-words text-sm font-medium">{order.items[0]?.name || 'Votre commande'}</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{order.items.reduce((sum, item) => sum + item.qty, 0)} articles</p></div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <p className="break-words text-lg font-bold tabular-nums">{formatFcfa(order.total)}</p>
                    <Link className={actionClass} href={unpaid ? `/paiement/checkout/${order.id}` : `/commandes/${order.id}`}>{unpaid ? 'Payer' : 'Voir la commande'}<ArrowRight size={16} aria-hidden="true"/></Link>
                  </div>
                </article> : <p className="py-4 text-sm text-zinc-600 dark:text-zinc-400">Vous n’avez pas encore de commande.</p>}
              </section>

              <nav aria-label="Mes achats" className="grid gap-x-6 sm:grid-cols-2">
                {links.map(item => <Link key={item.href} href={item.href} className="flex min-h-16 min-w-0 items-center gap-3 border-b border-zinc-200 py-4 text-sm font-semibold hover:text-emerald-700 dark:border-zinc-800 dark:hover:text-emerald-400"><item.icon size={20} className="shrink-0" aria-hidden="true"/><span className="min-w-0 flex-1 break-words">{item.label}</span><ArrowRight size={16} className="shrink-0" aria-hidden="true"/></Link>)}
              </nav>
              <SourcingRequestsCard/>
              <section aria-labelledby="account-activity">
                <h2 id="account-activity" className="mb-3 text-lg font-bold">Activité récente</h2>
                {(user.activities || []).length ? <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">{user.activities!.map((activity, index) => <li key={activity.id || index} className="py-3"><p className="break-words text-sm">{activity.description}</p><p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('fr-FR') : ''}</p></li>)}</ul> : <p className="text-sm text-zinc-600 dark:text-zinc-400">Aucune activité récente.</p>}
              </section>
            </div>

            <aside className="min-w-0 space-y-8">
              <section aria-labelledby="account-settings">
                <h2 id="account-settings" className="mb-2 text-lg font-bold">Votre profil</h2>
                <nav aria-label="Paramètres du compte">{settings.map(item => <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-3 border-b border-zinc-200 py-3 text-sm hover:text-emerald-700 dark:border-zinc-800 dark:hover:text-emerald-400"><item.icon size={18} className="shrink-0" aria-hidden="true"/><span className="min-w-0 flex-1">{item.label}</span><ArrowRight size={16} className="shrink-0" aria-hidden="true"/></Link>)}</nav>
              </section>
              <section className="border-y border-amber-200 py-5 dark:border-amber-900" aria-labelledby="account-grains">
                <h2 id="account-grains" className="flex items-center gap-2 text-base font-bold"><Coins size={20} className="text-amber-700 dark:text-amber-400" aria-hidden="true"/>Programme Grains</h2>
                <p className="mt-3 break-words text-2xl font-bold tabular-nums">{user.grains.toLocaleString('fr-FR')} <span className="text-sm font-normal">grains</span></p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Palier {user.grainsTier}</p>
                <Link href="/grains" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Mes avantages<ArrowRight size={16} aria-hidden="true"/></Link>
              </section>
              <section><h2 className="text-lg font-bold">Besoin d’aide ?</h2><a href={brandWhatsAppUrl(undefined, "Bonjour DDM+, j’ai une question sur mon compte.")} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><MessageCircle size={18} aria-hidden="true"/>Contacter le support</a></section>
              <details className="border-t border-zinc-200 pt-4 dark:border-zinc-800"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Activité professionnelle</summary><div className="space-y-1"><Link href="/compte/ambassadeur" className="flex min-h-11 items-center gap-2 text-sm"><Gift size={18} aria-hidden="true"/>Ambassadeur</Link><Link href="/compte/precommandes" className="flex min-h-11 items-center gap-2 text-sm"><Package size={18} aria-hidden="true"/>Précommandes clients</Link><Link href={user.role === 'VENDOR' ? '/espace-vendeur' : '/devenir-vendeur'} className="flex min-h-11 items-center gap-2 text-sm"><Store size={18} aria-hidden="true"/>{user.role === 'VENDOR' ? 'Ma boutique' : 'Devenir vendeur'}</Link></div></details>
              <button onClick={logout} disabled={loggingOut} className={`${actionClass} text-red-700 dark:text-red-400`}><LogOut size={18} aria-hidden="true"/>{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}</button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}