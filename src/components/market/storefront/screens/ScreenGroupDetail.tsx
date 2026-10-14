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
import { CountdownChip } from '../CountdownChip';
import { LiveDot } from '../LiveDot';
import { mapGroupOrder } from '../data-mappers';
import { Skeleton } from '../Skeleton';
import RetryNotice from '../RetryNotice';
import type { Group } from '../types';
import { canRenderGroupVideo, renderGroupVideo } from '../group-video';
import PickupPointPicker from '../PickupPointPicker';
import DeliveryComparison, { GROUP_METHOD_TO_RATE } from '../DeliveryComparison';

const SHIP_LABEL: Record<string, string> = { express_3j: 'avion express (3 à 5 j)', air_15j: 'avion (10 à 15 j)', maritime_60j: 'bateau groupé (45 à 50 j)' };

// Lien public de la Chaîne WhatsApp DDM+ (vide = bouton masqué)
const WHATSAPP_CHANNEL_URL = /^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+$/.test(process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || '')
  ? (process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL as string)
  : '';


export default function ScreenGroupDetail() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const params = useParams();
  const groupId = params?.groupId as string;
  useEffect(() => {
    if (!groupId) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setGROUPS([]);
    const load = async () => {
      try {
        const response = await fetch(`/api/group-orders/${encodeURIComponent(groupId)}`, { signal: controller.signal });
        if (response.status === 404) { if (!controller.signal.aborted) setGROUPS([]); return; }
        if (!response.ok) throw new Error('Les informations et le prix du groupe ne sont pas disponibles. Réessayez avant de vous inscrire.');
        const data = await response.json();
        if (!data?.group) throw new Error('Les informations du groupe sont incomplètes.');
        if (!controller.signal.aborted) { setGROUPS([mapGroupOrder(data.group)]); setLoadError(null); }
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(failure instanceof Error ? failure.message : 'Groupe indisponible.');
      }
    };
    void load().finally(() => { if (!controller.signal.aborted) setLoading(false); });

    // Jauge de prix en direct : le volume et le palier évoluent à chaque inscription/départ
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void load();
    };
    const interval = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [groupId, attempt]);

  const g = GROUPS[0];
  const [qty, setQty] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [variantSel, setVariantSel] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [joinError, setJoinError] = useState('');
  // Numéro déjà rattaché à un compte : inscription enregistrée en invité
  const [accountExists, setAccountExists] = useState(false);
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
  const [showMyStatus, setShowMyStatus] = useState(false);
  const [remindPhone, setRemindPhone] = useState('');
  const [remindState, setRemindState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [remindMsg, setRemindMsg] = useState('');
  const [sharing, setSharing] = useState<'status' | 'social' | null>(null);
  const [shareNotice, setShareNotice] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [resell, setResell] = useState(false);
  const [resalePrice, setResalePrice] = useState('');
  const [subscribeAll, setSubscribeAll] = useState(true);
  const [videoSupported, setVideoSupported] = useState(false);
  const [pickupId, setPickupId] = useState('');
  const [qcOpen, setQcOpen] = useState<string | null>(null);
  useEffect(() => { setVideoSupported(canRenderGroupVideo()); }, []);
  // Lien « Rejoindre avec N pièces » (précommandes revendeur)
  useEffect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('qty'));
    if (Number.isInteger(q) && q >= 1 && q <= 1000) setQty(q);
  }, []);

  // Image pré-chargée : le partage natif doit partir immédiatement après le clic (sinon le navigateur le refuse)
  useEffect(() => {
    if (!g?.id) return;
    let cancelled = false;
    fetch(`/api/og/group/${encodeURIComponent(g.id)}?format=story`)
      .then(r => (r.ok ? r.blob() : null))
      .then(b => { if (b && !cancelled) setStoryFile(new File([b], `achat-groupe-${g.id}.png`, { type: 'image/png' })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [g?.id]);

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
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
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

  if (loadError) return <section className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-2xl font-bold">Achat groupé</h1><RetryNotice message={loadError} onRetry={() => setAttempt(value => value + 1)}/></section>;

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

  // Message de vente (gras WhatsApp avec *…*) ; `via` trace le canal d'où vient le visiteur
  const closeDate = g.deadlineAt ? new Date(g.deadlineAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const buildShareText = (via: string) => [
    '*Achetons ensemble, payons moins cher !*',
    g.name,
    `Prix actuel : *${formatFcfa(g.unit)}* la pièce${g.save > 0 && g.base > g.unit ? ` au lieu de ${formatFcfa(g.base)} (-${g.save} %)` : ''}`,
    nextTier
      ? `Plus on est nombreux, plus ça baisse : encore ${unitsToNextTier} pièce${unitsToNextTier > 1 ? 's' : ''} et on passe tous à *${formatFcfa(nextTier.price)}*.`
      : 'Meilleur prix atteint : il reste encore des places.',
    `Déjà ${g.participants} participant${g.participants > 1 ? 's' : ''} · ${g.currentQty}/${g.targetQty} pièces${closeDate ? ` · clôture ${closeDate}` : ''}`,
    'Aucun paiement maintenant : on paie le prix final à la clôture.',
    `Je rejoins ici : ${shareUrl}?via=${via}`,
  ].join('\n');
  const shareText = buildShareText('wa');

  // Visuel story 1080×1920 : la feuille de partage du téléphone propose « Mon statut » WhatsApp, TikTok, Instagram
  const shareStory = async (via: 'status' | 'social') => {
    if (sharing) return;
    setSharing(via);
    setShareNotice('');
    try {
      let file = storyFile;
      if (!file) {
        const res = await fetch(`/api/og/group/${encodeURIComponent(g.id)}?format=story`);
        if (!res.ok) throw new Error('image');
        file = new File([await res.blob()], `achat-groupe-${g.id}.png`, { type: 'image/png' });
        setStoryFile(file);
      }
      await shareOrDownload(file, buildShareText(via === 'status' ? 'status' : 'social'));
    } catch (e: any) {
      if (e?.name !== 'AbortError') setShareNotice('Partage impossible pour le moment, utilisez « Envoyer à mes contacts ».');
    } finally {
      setSharing(null);
    }
  };

  const shareOrDownload = async (file: File, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await navigator.clipboard?.writeText(text).catch(() => {});
    setShareNotice('Fichier téléchargé et message copié : publiez-les depuis votre téléphone (statut WhatsApp, TikTok, Instagram).');
  };

  const makeVideo = async () => {
    if (videoProgress !== null) return;
    setShareNotice('');
    setVideoProgress(0);
    try {
      const file = await renderGroupVideo({
        name: g.name,
        unit: g.unit,
        base: g.base,
        tiers: tiers.map((t) => ({ minQty: t.minQty, price: t.price })),
        currentQty: g.currentQty,
        targetQty: g.targetQty,
        participants: g.participants,
        closeDate,
        link: `${shareUrl}?via=tiktok`,
        brand: MARKET_BRAND.name,
        photoUrl: `/api/og/group/${encodeURIComponent(g.id)}?format=photo`,
      }, setVideoProgress);
      setVideoFile(file);
    } catch (e: any) {
      setShareNotice(e?.message || 'Vidéo impossible sur ce navigateur : partagez l’image.');
    } finally {
      setVideoProgress(null);
    }
  };

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

  const handleRemind = async () => {
    const p = remindPhone.replace(/\s/g, '').replace(/^(221|00221)/, '');
    if (!p || remindState === 'sending') return;
    setRemindState('sending');
    setRemindMsg('');
    try {
      const res = await fetch('/api/group-orders/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, phone: `+221 ${p}` }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Inscription au rappel impossible.');
      if (subscribeAll) {
        // Abonnement permanent aux nouveaux achats groupés (scope global)
        void fetch('/api/group-orders/interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: `+221 ${p}` }),
        }).catch(() => {});
      }
      setRemindState('done');
      setRemindMsg(data.already ? 'Vous êtes déjà inscrit au rappel.' : 'C’est noté : un SMS vous sera envoyé 24 h avant la clôture.');
    } catch (e: any) {
      setRemindState('error');
      setRemindMsg(e?.message || 'Inscription au rappel impossible.');
    }
  };

  // Prix du palier pour un volume total donné, à l'échelle de la variante choisie (estimation : le serveur fait foi)
  const variantScale = unitVariantAdjusted && g.unit > 0 ? unitEst / g.unit : 1;
  const priceAt = (totalQty: number) => {
    const hit = tiers.filter((t) => totalQty >= t.minQty).pop();
    return Math.round((hit ? hit.price : (g.base || g.unit)) * variantScale);
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
          ...(pickupId ? { pickupPointId: pickupId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinStatus('error');
        setJoinError(data.error || 'Erreur lors de la participation.');
        return;
      }
      setJoinStatus('success');
      setAccountExists(data?.accountExists === true);
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
        { n: 2, icon: "wallet", ttl: "Payez à la clôture", txt: "Groupe validé : vous recevez votre lien et payez le prix final (Wave, Orange Money, carte). Paiement garanti jusqu'à la livraison." },
        { n: 3, icon: "truck", ttl: "Transport au poids réel", txt: "Inspection et pesée du lot en Chine : chacun règle sa part de transport au poids réel, puis livraison ou retrait." },
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
      <Link href="/comment-ca-marche" className="text-xs font-bold text-violet-700 hover:underline dark:text-violet-300 md:col-span-3">
        Tout comprendre : paiement, transport au poids réel, garanties
      </Link>
    </div>
  );

  // Jauge du prix provisoire : l'axe est le volume engagé (le prix dépend des pièces, pas du nombre de personnes)
  const PriceGauge = () => {
    const lastTierQty = tiers.length ? tiers[tiers.length - 1].minQty : 0;
    const scaleMax = Math.max(g.targetQty || 0, lastTierQty, g.currentQty, 1);
    const pos = (q: number) => Math.min(100, Math.max(0, (q / scaleMax) * 100));
    const cursor = pos(g.currentQty);
    const bestPrice = tiers.length ? Math.min(...tiers.map((t) => t.price)) : g.unit;
    const savedVsBase = g.base > g.unit ? Math.round(((g.base - g.unit) / g.base) * 100) : 0;
    // Sur mobile, on ne jalonne que les paliers utiles pour éviter les libellés qui se chevauchent
    const markers = tiers.filter((t, i) => tiers.length <= 4 || i === 0 || i === tiers.length - 1 || t === nextTier || (g.currentQty >= t.minQty && !tiers.slice(i + 1).some((n) => g.currentQty >= n.minQty)));

    return (
      <div className="mb-3 rounded-xl bg-white/80 p-3 dark:bg-slate-900/70" aria-label="Évolution du prix provisoire">
        <div className="flex items-end justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Évolution du prix</p>
          <div className="text-right">
            {savedVsBase > 0 && <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">-{savedVsBase}% déjà gagnés</p>}
            {bestPrice < g.unit && <p className="text-[11px] text-slate-500 dark:text-slate-400">jusqu&apos;à <b className="tabular-nums">{formatFcfa(bestPrice)}</b>/pc</p>}
          </div>
        </div>

        <div className="relative mt-7 mb-9 px-1">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700" style={{ width: `${cursor}%` }}/>
          </div>
          <div className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums dark:bg-white dark:text-slate-900" style={{ left: `${Math.min(85, Math.max(15, cursor))}%` }}>
            {g.currentQty} pcs · {g.participants} pers.
          </div>
          {markers.map((t) => {
            const reached = g.currentQty >= t.minQty;
            return (
              <div key={t.minQty} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${Math.min(92, Math.max(8, pos(t.minQty)))}%` }}>
                <span className={cn('mx-auto block h-3 w-0.5', reached ? 'bg-white/90' : 'bg-slate-400 dark:bg-slate-500')}/>
                <span className={cn('mt-1 block whitespace-nowrap text-[11px] font-extrabold tabular-nums', reached ? 'text-emerald-700 dark:text-emerald-300' : t === nextTier ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400')}>
                  {formatFcfa(t.price)}
                </span>
                <span className="block whitespace-nowrap text-[11px] text-slate-400 tabular-nums">{t.minQty} pcs</span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {nextTier
            ? <>Encore <b className="tabular-nums">{unitsToNextTier}</b> pièce{unitsToNextTier > 1 ? 's' : ''} et le prix passe à <b className="tabular-nums text-violet-700 dark:text-violet-300">{formatFcfa(nextTier.price)}</b>/pc pour tout le groupe.</>
            : tiers.length > 0 ? 'Meilleur palier atteint.' : 'Prix unique pour ce groupe.'}
          {' '}Le prix final est celui atteint à la clôture.
        </p>
      </div>
    );
  };

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

        {PriceGauge()}

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-2.5 dark:bg-slate-900/70">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Engagés</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.currentQty} pcs</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Objectif</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.targetQty} pcs <span className="text-[11px] font-semibold text-slate-400">· {pct}%</span></p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Personnes</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{g.participants}</p>
          </div>
        </div>

        {nearGoal ? (
          <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-1.5">
              <Icon name="flame" size={12}/>
              Presque au but ! Plus que <b className="tabular-nums">{remaining}</b> unité{remaining > 1 ? 's' : ''} pour l&apos;objectif du groupe.
            </div>
          </div>
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
        <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span>
            <span className="block text-sm font-extrabold text-slate-900 dark:text-white">Détail des paliers de prix</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">Plus le groupe achète, plus le prix baisse pour tous.</span>
          </span>
          <Icon name="chevronRight" size={14} className="text-slate-400 transition-transform group-open:rotate-90"/>
        </summary>
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
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold',
                    reached ? 'bg-emerald-600 text-white' : isNext ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400')}>
                    {reached ? <Icon name="check" size={10}/> : i + 1}
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">{t.minQty} pcs</span>
                  {isNext && <span className="text-[11px] font-bold text-violet-600 dark:text-violet-300">← prochain objectif</span>}
                </div>
                <span className={cn('text-[12px] font-extrabold tabular-nums', reached ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white')}>
                  {formatFcfa(t.price)}<span className="text-[11px] font-semibold text-slate-400">/pc</span>
                </span>
              </div>
            );
          })}
        </div>
        </details>
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
        Votre inscription est associée à votre numéro de téléphone. Vous recevrez votre lien de paiement à la clôture, au prix final atteint.
      </p>
      {accountExists && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-bold">Ce numéro a déjà un compte DDM+</p>
          <p className="mt-0.5 leading-relaxed">Connectez-vous pour retrouver ce groupe dans votre espace et cumuler vos grains de fidélité.</p>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/achats-groupes/${groupId}`)}`}
            className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-amber-600 px-3 text-[12px] font-bold text-white hover:bg-amber-700"
          >
            Me connecter
          </Link>
        </div>
      )}
      {nextTier ? (
        <div className="mt-3 rounded-xl bg-violet-50 p-2.5 text-[12px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          Encore <b className="tabular-nums">{unitsToNextTier}</b> unité{unitsToNextTier > 1 ? 's' : ''} pour passer à <b className="tabular-nums">{formatFcfa(nextTier.price)}</b>/pc — invitez vos proches pour y arriver.
        </div>
      ) : null}
      {g.whatsappInviteUrl ? (
        <a
          href={g.whatsappInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white hover:bg-emerald-700"
        >
          <Icon name="whatsapp" size={15}/>Rejoindre la discussion WhatsApp du groupe
        </a>
      ) : null}
    </Card>
  ) : (
    <Card id="join-form" className="scroll-mt-24 p-4">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Rejoindre le groupe</h3>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Aucun paiement maintenant : vous paierez le prix final à la clôture.</p>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom</span>
          <input id="join-name" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Amadou Diallo" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"/>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
            <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="77 123 45 67" className="h-10 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white dark:placeholder-slate-500"/>
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button aria-label="Diminuer la quantité" onClick={()=>setQty(q=>Math.max(1,q-1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={14}/></button>
            <input value={qty} readOnly className="flex-1 bg-transparent text-center text-sm font-extrabold text-slate-900 dark:text-white tabular-nums"/>
            <button aria-label="Augmenter la quantité" onClick={()=>setQty(q=>q+1)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={14}/></button>
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
                      <span className={cn("ml-1 text-[11px] tabular-nums", active ? "text-violet-500 dark:text-violet-400" : "text-slate-400")}>
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
        {(() => {
          const withMe = g.currentQty + qty;
          const myUnit = priceAt(withMe);
          const afterMe = tiers.find((t) => t.minQty > withMe);
          const best = tiers.length ? tiers[tiers.length - 1] : null;
          const rows: { label: string; unit: number; strong?: boolean }[] = [
            { label: `Avec vous (${withMe} pcs)`, unit: myUnit, strong: true },
          ];
          if (afterMe) rows.push({ label: `Si le groupe atteint ${afterMe.minQty} pcs`, unit: priceAt(afterMe.minQty) });
          if (best && best !== afterMe && best.minQty > withMe) rows.push({ label: `Au meilleur palier (${best.minQty} pcs)`, unit: priceAt(best.minQty) });
          return (
            <Fragment>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Votre total selon le groupe{unitVariantAdjusted ? ' · votre variante' : ''}</p>
              {rows.map((r) => (
                <div key={r.label} className="mt-3 flex flex-col gap-1 text-[12px]">
                  <span className={r.strong ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}>{r.label}</span>
                  <span className="flex flex-wrap items-baseline gap-x-1 tabular-nums">
                    <span className="text-[11px] text-slate-400">{formatFcfa(r.unit)}/pc · </span>
                    <b className={r.strong ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-white'}>{formatFcfa(r.unit * qty)}</b>
                  </span>
                </div>
              ))}
              {myUnit < unitEst && (
                <p className="mt-2 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Votre commande fait passer tout le groupe au palier suivant !</p>
              )}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[12px] dark:border-slate-700">
                <span className="text-emerald-700 dark:text-emerald-300">Économie vs achat seul</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">-{formatFcfa(Math.max(0, baseEst - myUnit) * qty)}</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                + transport {SHIP_LABEL[g.shippingMethod || ''] || ''}{g.shippingCostPerUnit ? ` (environ ${formatFcfa(g.shippingCostPerUnit)}/pièce, soit ${formatFcfa(g.shippingCostPerUnit * qty)})` : ''} : facturé au poids réel après la pesée du lot en Chine, à régler avant la livraison.
              </p>
              <button type="button" onClick={() => setResell((v) => !v)} className="mt-2 flex w-full items-center justify-between rounded-lg bg-white px-2.5 py-2 text-[12px] font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span>Je revends : calculer ma marge</span>
                <Icon name="chevronRight" size={13} className={cn('text-slate-400 transition-transform', resell && 'rotate-90')}/>
              </button>
              {resell && (() => {
                const shipEst = g.shippingCostPerUnit || 0;
                const cost = myUnit + shipEst;
                const suggested = Math.round((cost * 1.3) / 100) * 100;
                const resale = Number(resalePrice) > 0 ? Number(resalePrice) : suggested;
                const profit = (resale - cost) * qty;
                const margin = resale > 0 ? Math.round(((resale - cost) / resale) * 100) : 0;
                return (
                  <div className="mt-2 rounded-lg bg-white p-2.5 dark:bg-slate-900">
                    <label className="flex items-center justify-between gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                      Prix de revente par pièce
                      <input type="number" inputMode="numeric" min={0} value={resalePrice} placeholder={String(suggested)} onChange={e => setResalePrice(e.target.value)} className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-bold tabular-nums outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/>
                    </label>
                    <div className="mt-2 flex justify-between text-[12px]">
                      <span className="text-slate-600 dark:text-slate-400">Bénéfice estimé sur {qty} pcs</span>
                      <b className={cn('tabular-nums', profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600')}>{formatFcfa(profit)} · {margin} %</b>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Coût de revient {formatFcfa(cost)}/pièce{shipEst ? ` dont transport estimé ${formatFcfa(shipEst)}` : ' (transport en plus)'}, au prix provisoire. À réception, un clic met le lot en vente dans votre boutique DDM+ avec le tag « En stock » (fiche, photos et prix d&apos;achat pré-remplis).</p>
                    <Link
                      href={`/compte/precommandes?groupId=${encodeURIComponent(g.id)}&price=${resale}`}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-[12px] font-bold text-white hover:bg-violet-700"
                    >
                      <Icon name="store" size={13}/> Ouvrir les précommandes à mes clients
                    </Link>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Vos clients réservent à votre prix sur votre page (sans voir le prix DDM+) ; vous commandez ensuite la quantité exacte.</p>
                  </div>
                );
              })()}
            </Fragment>
          );
        })()}
      </div>

      <div className="mt-3">
        <PickupPointPicker value={pickupId} onChange={setPickupId} homeLabel="Livraison à domicile" compact/>
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
        <Icon name="lock" size={11}/>Le total baisse encore si le groupe grandit
      </p>
    </Card>
  );

  const ShareCard = () => (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/og/group/${encodeURIComponent(g.id)}?format=story`}
          alt="Visuel à partager"
          loading="lazy"
          className="h-36 w-[81px] flex-shrink-0 rounded-lg bg-violet-100 object-cover shadow-sm dark:bg-violet-950"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Faites baisser le prix : partagez</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Plus on est nombreux, plus ça baisse pour tout le monde. Le visuel et le message sont prêts.</p>
          <button
            type="button"
            onClick={() => void shareStory('status')}
            disabled={!!sharing}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Icon name="whatsapp" size={15}/>{sharing === 'status' ? 'Préparation…' : 'Mettre en statut WhatsApp'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
          <Icon name="whatsapp" size={13}/>Envoyer à mes contacts
        </a>
        <button type="button" onClick={() => void shareStory('social')} disabled={!!sharing} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
          <Icon name="share" size={13}/>{sharing === 'social' ? 'Préparation…' : 'TikTok · Instagram'}
        </button>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${shareUrl}?via=fb`)}`} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">Facebook</a>
        <button onClick={copy} className={cn("flex h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-colors", copied ? "bg-emerald-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900")}>
          {copied ? <Fragment><Icon name="check" size={12}/>Lien copié</Fragment> : <Fragment><Icon name="copy" size={12}/>Copier le lien</Fragment>}
        </button>
      </div>
      {shareNotice && <p className="px-4 pb-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{shareNotice}</p>}
      {videoSupported && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {videoFile ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => void shareOrDownload(videoFile, buildShareText('tiktok')).catch(() => {})} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[12px] font-bold text-white dark:bg-white dark:text-slate-900">
                <Icon name="share" size={13}/>Publier la vidéo (TikTok, statut)
              </button>
              <button type="button" onClick={() => setVideoFile(null)} className="h-10 rounded-lg border border-slate-200 px-3 text-[12px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Refaire</button>
            </div>
          ) : (
            <button type="button" onClick={() => void makeVideo()} disabled={videoProgress !== null} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 text-[12px] font-bold text-violet-700 disabled:opacity-80 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
              {videoProgress !== null ? `Création de la vidéo… ${videoProgress} % (gardez la page ouverte)` : 'Créer une vidéo de 10 s pour TikTok'}
            </button>
          )}
        </div>
      )}
      {g.whatsappInviteUrl && (
        <a href={g.whatsappInviteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border-t border-slate-200 bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-slate-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="flex items-center gap-2"><Icon name="whatsapp" size={15}/>Discuter avec le groupe sur WhatsApp</span>
          <Icon name="chevronRight" size={14}/>
        </a>
      )}
    </Card>
  );

  const RemindCard = () => (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Icon name="bell" size={15}/></span>
        <div>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Pas encore décidé ?</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Un SMS 24 h avant la clôture, avec le prix atteint.</p>
        </div>
      </div>
      {remindState === 'done' ? (
        <p className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-center text-[12px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{remindMsg}</p>
      ) : (
        <Fragment>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
              <input value={remindPhone} onChange={e => setRemindPhone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void handleRemind(); }} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="77 123 45 67" aria-label="Numéro pour le rappel" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white dark:placeholder-slate-500"/>
            </div>
            <Button variant="secondary" size="md" disabled={remindState === 'sending' || !remindPhone.trim()} onClick={() => void handleRemind()}>
              {remindState === 'sending' ? '…' : 'Me prévenir'}
            </Button>
          </div>
          {remindState === 'error' && <p className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400">{remindMsg}</p>}
          <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={subscribeAll} onChange={e => setSubscribeAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-600"/>
            M&apos;annoncer aussi les prochains achats groupés (vous pourrez vous désabonner à tout moment)
          </label>
        </Fragment>
      )}
      {WHATSAPP_CHANNEL_URL && (
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366]/10 py-2 text-[12px] font-bold text-[#128C7E] hover:bg-[#25D366]/20">
          Suivre la chaîne WhatsApp DDM+ : tous les nouveaux groupes en direct
        </a>
      )}
    </Card>
  );

  const MyStatusCard = () => {
    const payStatus = myPayData?.participant?.paymentStatus;
    if (!showMyStatus && myPay !== 'found') {
      return (
        <button
          type="button"
          onClick={() => setShowMyStatus(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="flex items-center gap-2">
            <Icon name="user" size={15} className="text-slate-500"/>
            <span className="text-[13px] font-bold text-slate-900 dark:text-white">Déjà inscrit ? Voir ma participation</span>
          </span>
          <Icon name="chevronRight" size={14} className="text-slate-400"/>
        </button>
      );
    }
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon name="user" size={15}/></span>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Déjà inscrit ?</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Retrouvez votre participation et votre paiement.</p>
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
                {myPayData.checkoutUrl ? (
                  <Button variant="emerald" size="md" className="w-full" onClick={() => router.push(myPayData.checkoutUrl)}>
                    {payStatus === 'partial' ? 'Finaliser mon paiement' : 'Payer maintenant'}
                  </Button>
                ) : myPayData.paymentOpensAtClose ? (
                  <p className="rounded-xl bg-violet-50 p-2.5 text-center text-[11px] font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                    Le paiement s&apos;ouvre à la validation du groupe, au prix final du meilleur palier atteint. Votre lien vous sera envoyé.
                  </p>
                ) : null}
              </Fragment>
            )}
            {myPayData.transport && (
              myPayData.transport.paid ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-center text-[12px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ✓ Transport réglé ({formatFcfa(myPayData.transport.amount)})
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">Transport au poids réel : {formatFcfa(myPayData.transport.amount)}</p>
                  <p className="mt-0.5">{myPayData.transport.weightKg ? `Lot pesé en Chine : ${myPayData.transport.weightKg} kg, ` : ''}votre part selon vos pièces. À régler avant la livraison.</p>
                  {myPayData.transport.checkoutUrl && (
                    <Button variant="emerald" size="md" className="mt-2 w-full" onClick={() => router.push(myPayData.transport.checkoutUrl)}>
                      Régler le transport
                    </Button>
                  )}
                </div>
              )
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
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{[p.v, p.t].filter(Boolean).join(' · ')}</p>
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
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Modéré par DDM+ · {g.participants} membres</p>
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
                <span className={cn("grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white", m.staff ? "bg-emerald-600" : "bg-gradient-to-br from-violet-500 to-emerald-500")}>{initialsOf(m.n)}</span>
                <div className={cn("min-w-0 flex-1 rounded-2xl px-3 py-2", m.staff ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900" : "bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800")}>
                  <div className="flex items-baseline gap-2">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">{maskName(m.n)}</p>
                    {m.staff && <Badge tone="emerald" className="!text-[11px] !px-1 !py-0">Support</Badge>}
                    <span className="text-[11px] text-slate-400">{m.t}</span>
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

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
            {/* Hero produit + progression */}
            <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x md:col-start-1 md:row-start-1">
              <div className="md:grid md:grid-cols-2">
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 md:aspect-square">
                  <Image src={g.image} alt={g.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                  <div className="absolute left-3 top-3 md:left-4 md:top-4"><Badge tone="violet"><Icon name="users" size={11}/> Achat groupé</Badge></div>
                </div>
                <div className="p-4 md:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:text-xs">{g.category}</p>
                  <h1 className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:mt-1 md:text-2xl">{g.name}</h1>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2 md:mt-4">
                    <span className="text-2xl font-extrabold text-violet-700 tabular-nums dark:text-violet-300">{formatFcfa(g.unit)}</span>
                    {g.save > 0 && g.base > g.unit && (
                      <>
                        <span className="text-[13px] font-semibold text-slate-400 line-through tabular-nums md:text-base">{formatFcfa(g.base)}</span>
                        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">-{g.save}%</span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 md:mt-1 md:text-xs">Prix provisoire — le prix final est celui du palier atteint à la clôture</p>
                  {participants.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {participants.slice(0, 4).map((p, idx) => (
                          <span key={`${p.n}-${idx}`} className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[11px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900">{p.i}</span>
                        ))}
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-slate-400">
                        <b className="text-slate-900 dark:text-white">{participants.slice(0, 2).map((p) => p.n.split(' ')[0]).join(', ')}</b>
                        {g.participants > 2 ? <> et {g.participants - 2} autre{g.participants - 2 > 1 ? 's' : ''}</> : null} {g.participants > 1 ? 'ont' : 'a'} rejoint
                      </p>
                    </div>
                  ) : canJoin ? (
                    <p className="mt-3 text-[12px] font-semibold text-violet-700 dark:text-violet-300">Soyez le premier à rejoindre ce groupe.</p>
                  ) : null}
                  <div className="mt-4 md:mt-6">
                    {ProgressPanel()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Décision d'abord : rejoindre juste après le prix ; colonne droite sticky sur desktop */}
            <div className="md:col-start-2 md:row-start-1 md:row-span-4">
              <div className="md:sticky md:top-[calc(var(--mkt-header-h,0px)+12px)] md:space-y-4">
                <Section title="Rejoindre" className="mt-2 bg-white py-4 dark:bg-slate-900 md:mt-0 md:bg-transparent md:p-0 md:dark:bg-transparent">
                  {JoinForm()}
                </Section>
                <div className="mx-4 mt-2 md:mx-0 md:mt-4">{MyStatusCard()}</div>
                {canJoin && (
                  <Section title="Inviter" className="mt-2 bg-white py-4 dark:bg-slate-900 md:mt-4 md:bg-transparent md:p-0 md:dark:bg-transparent">
                    {ShareCard()}
                  </Section>
                )}
                {canJoin && joinStatus !== 'success' && myPay !== 'found' && (
                  <div className="mx-4 mt-2 md:mx-0 md:mt-4">{RemindCard()}</div>
                )}
                {canJoin && (
                  <div className="mx-4 mt-2 md:mx-0 md:mt-4">
                    <Link href={`/compte/precommandes?groupId=${encodeURIComponent(g.id)}`} className="block rounded-2xl border border-violet-200 bg-violet-50 p-4 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40">
                      <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-900 dark:text-white"><Icon name="store" size={14} className="text-violet-600"/> Faites des affaires avec ce groupe</p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">Ouvrez votre page de précommande à votre prix : vos proches réservent, vous commandez la quantité exacte et gardez la marge. Le prix DDM+ reste confidentiel.</p>
                      <p className="mt-2 text-[12px] font-bold text-violet-700 dark:text-violet-300">Ouvrir mes précommandes →</p>
                    </Link>
                  </div>
                )}
                <div className="mx-4 mt-2 md:mx-0 md:mt-4">{TiersPanel()}</div>
              </div>
            </div>

            <Card className="mt-2 rounded-none border-x-0 p-4 dark:border-slate-800 md:col-start-1 md:row-start-2 md:mt-0 md:rounded-2xl md:border-x md:p-5">
              <h2 className="mb-4 text-base font-extrabold text-slate-900 dark:text-white">Comment ça marche ?</h2>
              {HowItWorks()}

              {g.qualityCheck && (g.qualityCheck.photos.length > 0 || g.qualityCheck.videos.length > 0) && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-900 dark:text-white">
                    <Icon name="shield" size={14} className="text-emerald-600"/> Contrôle qualité fait en Chine{g.qualityCheck.result === 'partial' ? ' (partiel)' : ''}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Photos prises à la réception à Guangzhou, avant l&apos;expédition{g.qualityCheck.checkedAt ? `, le ${new Date(g.qualityCheck.checkedAt).toLocaleDateString('fr-FR')}` : ''}.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {g.qualityCheck.photos.map((src) => (
                      <button key={src} type="button" onClick={() => setQcOpen(src)} className="aspect-square overflow-hidden rounded-lg bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Photo du contrôle qualité" loading="lazy" className="h-full w-full object-cover"/>
                      </button>
                    ))}
                  </div>
                  {g.qualityCheck.videos.map((src) => (
                    <video key={src} src={src} controls preload="metadata" className="mt-2 w-full rounded-lg bg-black"/>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <DeliveryComparison highlight={g.shippingMethod ? GROUP_METHOD_TO_RATE[g.shippingMethod] : undefined} showLocal={false}/>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Pourquoi passer par DDM+ ?</p>
                  <ul className="mt-2 space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
                    <li className="flex gap-2"><Icon name="lock" size={13} className="mt-0.5 flex-shrink-0 text-emerald-600"/>Vous payez à la clôture, au prix final : l&apos;argent est bloqué jusqu&apos;à la livraison et remboursé si rien n&apos;arrive.</li>
                    <li className="flex gap-2"><Icon name="shield" size={13} className="mt-0.5 flex-shrink-0 text-emerald-600"/>Contrôle qualité à Guangzhou avant l&apos;expédition, photos publiées ici.</li>
                    <li className="flex gap-2"><Icon name="users" size={13} className="mt-0.5 flex-shrink-0 text-emerald-600"/>Participants et volume visibles en direct : pas de stock fantôme.</li>
                    <li className="flex gap-2"><Icon name="truck" size={13} className="mt-0.5 flex-shrink-0 text-emerald-600"/>Suivi jusqu&apos;à Dakar, puis 48 h après la livraison pour signaler un problème ou demander un retour.</li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="mt-2 md:col-start-1 md:row-start-3 md:mt-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="bg-white px-4 py-4 dark:bg-slate-900 md:bg-transparent md:p-0 md:dark:bg-transparent">
                {ParticipantsList()}
              </div>
              <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900 md:mt-0 md:bg-transparent md:p-0 md:dark:bg-transparent">
                {ChatBox()}
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
      {qcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setQcOpen(null)} role="dialog" aria-label="Photo du contrôle qualité">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qcOpen} alt="Photo du contrôle qualité" className="max-h-full max-w-full rounded-lg"/>
        </div>
      )}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">Prix provisoire · {g.currentQty}/{g.targetQty} pcs</p>
            <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
              <p className="text-[16px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</p>
              {g.save > 0 && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{g.save}%</p>}
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
              onClick={() => {
                // Formulaire incomplet : amener l'utilisateur au formulaire
                // plutôt que d'afficher une erreur hors écran.
                if (!name.trim() || !phone.replace(/\s/g, '')) {
                  document.getElementById('join-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setTimeout(() => document.getElementById('join-name')?.focus({ preventScroll: true }), 350);
                  return;
                }
                void handleJoin();
              }}
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
