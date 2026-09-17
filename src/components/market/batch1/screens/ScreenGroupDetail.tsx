'use client';

import { useState, useEffect, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MARKET_BRAND } from '@/lib/branding';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Section } from '../Section';
import { TrustStrip } from '../TrustStrip';
import { ProgressBar } from '../ProgressBar';
import { CountdownChip } from '../CountdownChip';
import { LiveDot } from '../LiveDot';
import { mapGroupOrder } from '../data-mappers';
import { Skeleton } from '../Skeleton';
import type { Group } from '../types';


export default function ScreenGroupDetail() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);

  const params = useParams();
  const groupId = params?.groupId as string;
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    fetch(`/api/group-orders/${groupId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.group) {
          setGROUPS([mapGroupOrder(data.group)]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  const g = GROUPS[0];
  const [qty, setQty] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [variantSel, setVariantSel] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [joinError, setJoinError] = useState('');
  const [chatToken, setChatToken] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; n: string; m: string; t: string; staff: boolean }[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [myPhone, setMyPhone] = useState('');
  const [myPay, setMyPay] = useState<'idle'|'loading'|'found'|'error'>('idle');
  const [myPayData, setMyPayData] = useState<any>(null);
  const [myPayError, setMyPayError] = useState('');
  const [extending, setExtending] = useState(false);
  const [extendMsg, setExtendMsg] = useState('');

  // Prix estimé côté client — le serveur recalcule de façon autoritaire au join.
  const selectedVariantPrice = Math.max(
    0,
    ...(g?.variantGroups || [])
      .flatMap((grp) => grp.variants)
      .filter((v) => Object.values(variantSel).includes(v.id))
      .map((v) => v.price || 0)
  );
  const unitVariantAdjusted = selectedVariantPrice > 0 && (g?.base || 0) > 0;
  const unitEst = unitVariantAdjusted ? Math.round(g.unit * (selectedVariantPrice / g.base)) : (g?.unit || 0);
  const baseEst = unitVariantAdjusted ? selectedVariantPrice : (g?.base || 0);

  const chatStorageKey = `gchat:${groupId}`;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(chatStorageKey);
      if (stored) setChatToken(stored);
    } catch {}
  }, [chatStorageKey]);

  useEffect(() => {
    if (!chatToken || !groupId) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/group-orders/${groupId}/chat/messages?token=${encodeURIComponent(chatToken)}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled || !Array.isArray(data?.messages)) return;
          setChatMessages(data.messages.map((m: any) => ({
            id: String(m.id),
            n: m.authorName || 'Participant',
            m: m.text || '',
            t: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            staff: m.authorType === 'admin',
          })));
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [chatToken, groupId]);

  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text || !chatToken || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/group-orders/${groupId}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, token: chatToken }),
      });
      const data = await res.json();
      if (res.ok && data?.message) {
        setChatDraft('');
        setChatMessages(prev => [...prev, {
          id: String(data.message.id),
          n: data.message.authorName || 'Vous',
          m: data.message.text || text,
          t: new Date(data.message.createdAt || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          staff: data.message.authorType === 'admin',
        }]);
      }
    } catch {}
    setChatSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl md:px-6 md:py-6">
          <div className="md:grid md:grid-cols-[1fr_400px] md:gap-6">
            <div className="md:grid md:grid-cols-2">
              <Skeleton className="aspect-[4/3] w-full md:aspect-square"/>
              <div className="space-y-3 p-4 md:p-6">
                <Skeleton className="h-3 w-24"/>
                <Skeleton className="h-6 w-3/4"/>
                <Skeleton className="h-10 w-40"/>
                <Skeleton className="h-32 w-full rounded-2xl"/>
              </div>
            </div>
            <div className="space-y-4 p-4 md:p-0">
              <Skeleton className="h-64 w-full rounded-2xl"/>
              <Skeleton className="h-40 w-full rounded-2xl"/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!g) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Icon name="package" size={32}/>
        <p className="text-sm font-semibold">Groupe introuvable</p>
        <Link href="/achats-groupes" className="text-[12px] font-bold text-violet-600 dark:text-violet-400">← Voir les achats groupés</Link>
      </div>
    );
  }

  const pct = g.targetQty > 0 ? Math.round((g.currentQty / g.targetQty) * 100) : 0;
  const remaining = Math.max(0, g.targetQty - g.currentQty);

  // Paliers réels du groupe : palier courant = plus grand minQty ≤ currentQty,
  // prochain palier = premier minQty > currentQty.
  const tiers = (g.priceTiers || []).slice().sort((a, b) => a.minQty - b.minQty);
  const nextTier = tiers.find((t) => t.minQty > g.currentQty);
  const unitsToNextTier = nextTier ? Math.max(0, nextTier.minQty - g.currentQty) : 0;
  const joinable = g.status === 'live' || g.status === 'almost';
  const nearGoal = joinable && g.targetQty > 0 && remaining > 0 && remaining <= Math.max(3, Math.ceil(g.targetQty * 0.1));

  const relTime = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff) || diff < 0) return '';
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  };
  const maskName = (full: string) => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Participant';
    return parts[0] + (parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '');
  };
  const initialsOf = (full: string) => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'P') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
  };

  const participants = (g.participantList || [])
    .slice()
    .sort((a, b) => (b.joinedAt ? new Date(b.joinedAt).getTime() : 0) - (a.joinedAt ? new Date(a.joinedAt).getTime() : 0))
    .map((p) => ({ i: initialsOf(p.name), n: maskName(p.name), q: p.qty, v: p.variantLabels?.join(' · '), t: relTime(p.joinedAt) }));
  const joinedLastHour = (g.participantList || []).filter(
    (p) => p.joinedAt && Date.now() - new Date(p.joinedAt).getTime() < 3600000
  ).length;

  // Seuls les groupes ouverts acceptent des inscriptions — 'filled', 'ordered',
  // 'shipped', 'delivered', 'cancelled', 'draft' affichent leur état réel.
  const canJoin = joinable;
  const closedLabel = ({
    filled: 'Groupe complet — commande en préparation',
    ordered: 'Commande groupée passée — traitement en cours',
    shipped: 'Commande groupée expédiée',
    delivered: 'Groupe livré',
    cancelled: 'Groupe annulé',
    expired: 'Date limite dépassée — inscriptions closes',
    draft: 'Groupe en préparation',
  } as Record<string, string>)[g.status] || 'Inscriptions fermées';

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/achats-groupes/${g.id}`
    : `${MARKET_BRAND.url}/achats-groupes/${g.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const checkMyPayment = async (rawPhone?: string) => {
    const p = (rawPhone ?? myPhone).replace(/\s/g, '').replace(/^(221|00221)/, '');
    if (!p) return;
    setMyPay('loading');
    setMyPayError('');
    try {
      const res = await fetch(`/api/group-orders/${groupId}/my-payment?phone=${encodeURIComponent(`+221 ${p}`)}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMyPay('error');
        setMyPayError(data?.error || 'Aucune participation trouvée avec ce numéro.');
        return;
      }
      setMyPay('found');
      setMyPayData(data);
    } catch {
      setMyPay('error');
      setMyPayError('Impossible de contacter le serveur.');
    }
  };

  const shareText = `Achat groupé DDM+ : ${g.name} — on est déjà ${g.participants} participant${g.participants > 1 ? 's' : ''}. ${nextTier ? `Encore ${unitsToNextTier} unité${unitsToNextTier > 1 ? 's' : ''} pour passer à ${formatFcfa(nextTier.price)}/pc.` : `Prix débloqué : ${formatFcfa(g.unit)}/pc.`} ${shareUrl}`;

  const handleExtend = async () => {
    const p = myPhone.replace(/\s/g, '').replace(/^(221|00221)/, '');
    if (!p || extending) return;
    setExtending(true);
    setExtendMsg('');
    try {
      const res = await fetch(`/api/group-orders/${groupId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+221 ${p}` }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setExtendMsg(data?.error || 'Prolongation impossible.');
      } else {
        setExtendMsg(data.message || 'Deadline prolongée.');
        if (data.group) setGROUPS([mapGroupOrder(data.group)]);
      }
    } catch {
      setExtendMsg('Impossible de contacter le serveur.');
    }
    setExtending(false);
  };

  const handleJoin = async () => {
    setJoinStatus('submitting');
    setJoinError('');
    const cleanPhone = phone.replace(/\s/g, '');
    if (!name.trim() || !cleanPhone) {
      setJoinStatus('error');
      setJoinError('Veuillez renseigner votre nom et téléphone.');
      return;
    }
    const variantIds = (g?.variantGroups || [])
      .map((grp) => variantSel[grp.name])
      .filter(Boolean);
    if (g?.requiresVariant && variantIds.length < (g.variantGroups?.length || 0)) {
      setJoinStatus('error');
      setJoinError('Veuillez sélectionner une option pour chaque variante.');
      return;
    }
    try {
      const res = await fetch(`/api/group-orders/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: `+221 ${cleanPhone.replace(/^(221|00221)/, '')}`,
          qty,
          variantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinStatus('error');
        setJoinError(data.error || 'Erreur lors de la participation.');
        return;
      }
      setJoinStatus('success');
      if (data?.chat?.token) {
        try { sessionStorage.setItem(chatStorageKey, data.chat.token); } catch {}
        setChatToken(data.chat.token);
      }
      // Auto-vérifie le statut participant via le téléphone saisi (my-payment)
      void checkMyPayment(cleanPhone);
      // refresh group data
      const refreshed = await fetch(`/api/group-orders/${groupId}`).then(r => r.json());
      if (refreshed?.group) setGROUPS([mapGroupOrder(refreshed.group)]);
    } catch {
      setJoinStatus('error');
      setJoinError('Impossible de communiquer avec le serveur.');
    }
  };

  const HowItWorks = () => (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { n: 1, icon: "users", ttl: "Rejoignez le groupe", txt: "Réservez votre quantité, sans engagement de paiement immédiat." },
        { n: 2, icon: "wallet", ttl: "Payez à la clôture", txt: "Une fois l'objectif atteint, on débite via Escrow Mobile Money." },
        { n: 3, icon: "truck", ttl: "Recevez livré", txt: "Inspection en Chine, transport et livraison suivie jusqu'à votre porte." },
      ].map((s)=>(
        <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 text-[11px] font-extrabold">0{s.n}</span>
            <Icon name={s.icon} size={18} className="text-slate-500 dark:text-slate-400"/>
          </div>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{s.ttl}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.txt}</p>
        </div>
      ))}
    </div>
  );

  const ProgressPanel = () => (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiveDot/>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Groupe en cours</span>
          </div>
          <CountdownChip time={g.deadline} urgent={g.status==="almost"}/>
        </div>

        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Progression</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{pct}<span className="text-xl text-slate-400">%</span></p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Restant</p>
            <p className="text-sm font-extrabold text-red-600 dark:text-red-400 tabular-nums">{remaining} unités</p>
          </div>
        </div>

        <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-3"/>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-2.5 dark:bg-slate-900/70">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Engagés</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.currentQty} pcs</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Objectif</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.targetQty} pcs</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Personnes</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.participants}</p>
          </div>
        </div>

        {nextTier && joinable ? (
          <div className={cn('mt-3 rounded-xl p-2.5 text-[11px] font-semibold', nearGoal ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300')}>
            <div className="flex items-center gap-1.5">
              <Icon name={nearGoal ? 'flame' : 'trending'} size={12}/>
              {nearGoal ? 'Presque au but !' : 'Prochain palier'} — encore <b className="tabular-nums">{unitsToNextTier}</b> unité{unitsToNextTier > 1 ? 's' : ''} pour passer à <b className="tabular-nums">{formatFcfa(nextTier.price)}</b>/pc
            </div>
          </div>
        ) : !nextTier && tiers.length > 0 && g.save > 0 ? (
          <p className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Icon name="check" size={12} className="mr-1 inline"/>Meilleur palier débloqué — {formatFcfa(g.unit)}/pc
          </p>
        ) : null}

        <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
          {joinedLastHour > 0 ? (
            <Fragment><b className="text-violet-700 dark:text-violet-300">{joinedLastHour} personne{joinedLastHour > 1 ? 's' : ''}</b> {joinedLastHour > 1 ? 'ont rejoint' : 'a rejoint'} dans la dernière heure.</Fragment>
          ) : (
            'Soyez le prochain à rejoindre le groupe.'
          )}
        </p>
      </div>
    </Card>
  );

  const TiersPanel = () => {
    if (tiers.length === 0) return null;
    const firstUnreachedIdx = tiers.findIndex((t) => t.minQty > g.currentQty);
    return (
      <Card className="p-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Paliers de prix</h3>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Plus le groupe achète, plus le prix baisse.</p>
        <div className="mt-3 space-y-1.5">
          {tiers.map((t, i) => {
            const reached = g.currentQty >= t.minQty;
            const isNext = i === firstUnreachedIdx;
            return (
              <div key={t.minQty} className={cn(
                'flex items-center justify-between rounded-xl border px-3 py-2',
                reached
                  ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : isNext
                    ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-extrabold',
                    reached ? 'bg-emerald-600 text-white' : isNext ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400')}>
                    {reached ? <Icon name="check" size={10}/> : i + 1}
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">{t.minQty} pcs</span>
                  {isNext && <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300">← prochain objectif</span>}
                </div>
                <span className={cn('text-[12px] font-extrabold tabular-nums', reached ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white')}>
                  {formatFcfa(t.price)}<span className="text-[10px] font-semibold text-slate-400">/pc</span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const JoinForm = () => !canJoin ? (
    <Card className="p-4">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Rejoindre le groupe</h3>
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {closedLabel}
      </div>
    </Card>
  ) : joinStatus === 'success' ? (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white"><Icon name="check" size={15}/></span>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Participation enregistrée</h3>
      </div>
      <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
        Ton inscription est associée à ton numéro de téléphone. Tu seras notifié à la clôture pour le paiement.
      </p>
      {nextTier ? (
        <div className="mt-3 rounded-xl bg-violet-50 p-2.5 text-[12px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          Encore <b className="tabular-nums">{unitsToNextTier}</b> unité{unitsToNextTier > 1 ? 's' : ''} pour passer à <b className="tabular-nums">{formatFcfa(nextTier.price)}</b>/pc — invite pour accélérer.
        </div>
      ) : null}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white hover:bg-emerald-700"
      >
        <Icon name="whatsapp" size={15}/>Inviter des amis
      </a>
    </Card>
  ) : (
    <Card className="p-4">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Rejoindre le groupe</h3>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Aucun paiement immédiat — vous serez notifié à la clôture.</p>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Amadou Diallo" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"/>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="77 123 45 67" className="h-10 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white dark:placeholder-slate-500"/>
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={14}/></button>
            <input value={qty} readOnly className="flex-1 bg-transparent text-center text-sm font-extrabold text-slate-900 dark:text-white tabular-nums"/>
            <button onClick={()=>setQty(q=>q+1)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={14}/></button>
          </div>
        </label>
        {(g.variantGroups || []).map((grp) => (
          <div key={grp.name}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{grp.name} <span className="text-red-500">*</span></span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {grp.variants.map((v) => {
                const active = variantSel[grp.name] === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantSel((s) => ({ ...s, [grp.name]: v.id }))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                      active
                        ? "border-violet-600 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    {v.name}
                    {typeof v.price === 'number' && v.price > 0 && (
                      <span className={cn("ml-1 text-[10px] tabular-nums", active ? "text-violet-500 dark:text-violet-400" : "text-slate-400")}>
                        {formatFcfa(v.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-600 dark:text-slate-400">Prix groupe{unitVariantAdjusted ? ' (votre variante)' : ''}</span>
          <span className="font-bold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(unitEst)}/pc</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-slate-600 dark:text-slate-400">Sous-total</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatFcfa(unitEst * qty)}</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-emerald-700 dark:text-emerald-300">Économie vs. seul</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">-{formatFcfa(Math.max(0, baseEst - unitEst) * qty)}</span>
        </div>
      </div>

      {joinStatus === 'error' && joinError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {joinError}
        </div>
      )}
      <Button
        variant="violet"
        size="lg"
        className="mt-3 w-full"
        disabled={joinStatus === 'submitting'}
        onClick={handleJoin}
      >
        {joinStatus === 'submitting' ? 'Inscription…' : `Rejoindre pour ${qty} pcs`}
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <Icon name="lock" size={11}/>Aucun débit tant que le groupe n&apos;est pas complet
      </p>
    </Card>
  );

  const ShareCard = () => (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon name="share" size={15}/></span>
        <div>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Invitez pour aller plus vite</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Plus vous êtes, plus le prix baisse.</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-1 pl-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="min-w-0 flex-1 truncate text-[12px] font-mono text-slate-600 dark:text-slate-300">{shareUrl}</span>
        <button onClick={copy} className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors", copied ? "bg-emerald-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>
          {copied ? <Fragment><Icon name="check" size={12}/>Copié</Fragment> : <Fragment><Icon name="copy" size={12}/>Copier</Fragment>}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="whatsapp" size={13}/>WhatsApp</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">Facebook</a>
        <a href={`sms:?&body=${encodeURIComponent(shareText)}`} className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">SMS</a>
      </div>
    </Card>
  );

  const MyStatusCard = () => {
    const payStatus = myPayData?.participant?.paymentStatus;
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon name="user" size={15}/></span>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Déjà inscrit ?</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Retrouve ta participation et ton paiement.</p>
          </div>
        </div>

        {myPay === 'found' && myPayData ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl bg-slate-50 p-3 text-[12px] dark:bg-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Participant</span>
                <span className="font-bold text-slate-900 dark:text-white">{myPayData.participant?.name || '—'}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Quantité</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{myPayData.participant?.qty} pcs</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatFcfa(myPayData.participant?.totalAmount || 0)}</span>
              </div>
            </div>
            {payStatus === 'paid' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-center text-[12px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Participation payée — confirmée
              </div>
            ) : (
              <Fragment>
                <div className={cn('rounded-xl border p-2.5 text-center text-[12px] font-bold',
                  payStatus === 'partial'
                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
                  {payStatus === 'partial' ? 'Paiement partiel — solde à régler' : 'Paiement en attente'}
                </div>
                {myPayData.checkoutUrl && (
                  <Button variant="emerald" size="md" className="w-full" onClick={() => router.push(myPayData.checkoutUrl)}>
                    {payStatus === 'partial' ? 'Finaliser mon paiement' : 'Payer maintenant'}
                  </Button>
                )}
              </Fragment>
            )}
            {myPayData.participant?.isCreator && canJoin && (
              <Fragment>
                <button
                  onClick={() => void handleExtend()}
                  disabled={extending}
                  className="w-full rounded-xl border border-violet-200 bg-violet-50 py-2 text-[12px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                >
                  {extending ? 'Prolongation…' : 'Prolonger le groupe (+3 j)'}
                </button>
                {extendMsg && <p className="text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">{extendMsg}</p>}
              </Fragment>
            )}
          </div>
        ) : (
          <Fragment>
            <div className="mt-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
              <input
                value={myPhone}
                onChange={e => setMyPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void checkMyPayment(); }}
                placeholder="77 123 45 67"
                className="h-10 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white dark:placeholder-slate-500"
              />
            </div>
            {myPay === 'error' && myPayError && (
              <p className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400">{myPayError}</p>
            )}
            <Button variant="secondary" size="sm" className="mt-2 w-full" disabled={myPay === 'loading' || !myPhone.trim()} onClick={() => void checkMyPayment()}>
              {myPay === 'loading' ? 'Recherche…' : 'Voir mon statut'}
            </Button>
          </Fragment>
        )}
      </Card>
    );
  };

  const ParticipantsList = () => (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Participants <span className="text-slate-400 dark:text-slate-500 tabular-nums font-normal">· {g.participants}</span></h3>
        <Link href="/achats-groupes" className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">Tous</Link>
      </div>
      <div className="mt-3 space-y-2">
        {participants.length === 0 && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">Aucun participant pour l&apos;instant — soyez le premier.</p>
        )}
        {participants.map((p, idx)=>(
          <div key={`${p.n}-${idx}`} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[11px] font-extrabold text-white">{p.i}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white">{p.n}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{[p.v, p.t].filter(Boolean).join(' · ')}</p>
            </div>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 tabular-nums">{p.q} pcs</span>
          </div>
        ))}
      </div>
    </Card>
  );

  const ChatBox = () => (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon name="message" size={15}/></span>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Chat du groupe</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Modéré par DDM+ · {g.participants} membres</p>
          </div>
        </div>
        <LiveDot tone="green"/>
      </div>
      {chatToken ? (
        <Fragment>
          <div className="max-h-72 space-y-3 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950">
            {chatMessages.length === 0 && (
              <p className="py-6 text-center text-[12px] text-slate-500 dark:text-slate-400">Aucun message — lancez la discussion.</p>
            )}
            {chatMessages.map((m)=>(
              <div key={m.id} className="flex items-start gap-2">
                <span className={cn("grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white", m.staff ? "bg-emerald-600" : "bg-gradient-to-br from-violet-500 to-emerald-500")}>{initialsOf(m.n)}</span>
                <div className={cn("min-w-0 flex-1 rounded-2xl px-3 py-2", m.staff ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900" : "bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800")}>
                  <div className="flex items-baseline gap-2">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">{maskName(m.n)}</p>
                    {m.staff && <Badge tone="emerald" className="!text-[9px] !px-1 !py-0">Support</Badge>}
                    <span className="text-[10px] text-slate-400">{m.t}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-700 dark:text-slate-300">{m.m}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 p-2 dark:border-slate-800">
            <input
              value={chatDraft}
              onChange={e => setChatDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
              placeholder="Écrire un message…"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            <button onClick={sendChat} disabled={chatSending || !chatDraft.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"><Icon name="send" size={16}/></button>
          </div>
        </Fragment>
      ) : (
        <div className="p-4 text-center">
          <p className="text-[12px] text-slate-600 dark:text-slate-400">Le chat est réservé aux participants du groupe.</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Rejoignez le groupe pour consulter et écrire des messages.</p>
        </div>
      )}
    </Card>
  );

  return (
    <>
      <div className="min-h-full bg-slate-50 pb-28 dark:bg-slate-950 md:pb-0">
        <div className="mx-auto max-w-6xl md:px-6 md:py-6">
          {/* Fil d'ariane — desktop */}
          <div className="mb-4 hidden items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 md:flex">
            <Link href="/market" className="hover:text-slate-700 dark:hover:text-slate-300">Accueil</Link><Icon name="chevronRight" size={12}/>
            <Link href="/achats-groupes" className="hover:text-slate-700 dark:hover:text-slate-300">Achats groupés</Link><Icon name="chevronRight" size={12}/>
            <span className="line-clamp-1 max-w-[260px] text-slate-700 dark:text-slate-300">{g.name}</span>
          </div>

          <div className="md:grid md:grid-cols-[1fr_400px] md:gap-6">
            {/* Hero produit + progression */}
            <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x md:col-start-1 md:row-start-1">
              <div className="md:grid md:grid-cols-2">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 md:aspect-square">
                  <Image src={g.image} alt={g.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                  <div className="absolute left-3 top-3 md:left-4 md:top-4"><Badge tone="violet"><Icon name="users" size={11}/> Achat groupé</Badge></div>
                  <div className="absolute right-3 top-3"><CountdownChip time={g.deadline} urgent={g.status==="almost"}/></div>
                </div>
                <div className="p-4 md:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:text-xs">{g.category}</p>
                  <h1 className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:mt-1 md:text-2xl">{g.name}</h1>
                  <div className="mt-3 flex items-baseline gap-2 md:mt-4">
                    <span className="text-[28px] font-extrabold text-violet-700 tabular-nums dark:text-violet-300 md:text-4xl">{formatFcfa(g.unit)}</span>
                    {g.save > 0 && g.base > g.unit && (
                      <>
                        <span className="text-[13px] font-semibold text-slate-400 line-through tabular-nums md:text-base">{formatFcfa(g.base)}</span>
                        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">-{g.save}%</span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 md:mt-1 md:text-xs">Prix débloqué à la clôture du groupe</p>
                  <div className="mt-4 md:mt-6">
                    <ProgressPanel/>
                  </div>
                </div>
              </div>
            </Card>

            {/* Rejoindre + partager : flux mobile, colonne droite sticky desktop */}
            <div className="md:col-start-2 md:row-start-1 md:row-span-4">
              <div className="md:sticky md:top-[calc(var(--mkt-header-h,0px)+12px)] md:space-y-4">
                <Section title="Rejoindre" className="mt-2 bg-white py-4 dark:bg-slate-900 md:mt-0 md:bg-transparent md:p-0 md:dark:bg-transparent">
                  <JoinForm/>
                </Section>
                <div className="mx-4 mt-2 md:mx-0 md:mt-4"><TiersPanel/></div>
                <Section title="Inviter" className="mt-2 bg-white py-4 dark:bg-slate-900 md:mt-4 md:bg-transparent md:p-0 md:dark:bg-transparent">
                  <ShareCard/>
                </Section>
                <div className="mx-4 mt-2 md:mx-0 md:mt-4"><MyStatusCard/></div>
              </div>
            </div>

            <Card className="mt-2 rounded-none border-x-0 p-4 dark:border-slate-800 md:col-start-1 md:row-start-2 md:mt-0 md:rounded-2xl md:border-x md:p-5">
              <h2 className="mb-4 text-base font-extrabold text-slate-900 dark:text-white">Comment ça marche ?</h2>
              <HowItWorks/>
            </Card>

            <div className="mt-2 md:col-start-1 md:row-start-3 md:mt-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="bg-white px-4 py-4 dark:bg-slate-900 md:bg-transparent md:p-0 md:dark:bg-transparent">
                <ParticipantsList/>
              </div>
              <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900 md:mt-0 md:bg-transparent md:p-0 md:dark:bg-transparent">
                <ChatBox/>
              </div>
            </div>

            <div className="px-4 py-4 md:col-start-1 md:row-start-4 md:p-0">
              <div className="md:hidden"><TrustStrip compact/></div>
              <div className="hidden md:block"><TrustStrip/></div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre rejoindre — mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{g.currentQty}/{g.targetQty} pcs · {pct}%</p>
            <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
              <p className="text-[16px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</p>
              {g.save > 0 && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{g.save}%</p>}
            </div>
          </div>
          {joinStatus === 'success' ? (
            <span className="whitespace-nowrap flex-shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white">✓ Inscrit</span>
          ) : canJoin ? (
            <Button
              variant="violet"
              size="md"
              className="whitespace-nowrap flex-shrink-0"
              disabled={joinStatus === 'submitting'}
              onClick={handleJoin}
            >
              {joinStatus === 'submitting' ? 'Inscription…' : 'Rejoindre'}
            </Button>
          ) : (
            <span className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{closedLabel}</span>
          )}
        </div>
      </div>
    </>
  );

}
