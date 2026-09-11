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
import { Section } from '../Section';
import { TrustStrip } from '../TrustStrip';
import { ProgressBar } from '../ProgressBar';
import { CountdownChip } from '../CountdownChip';
import { LiveDot } from '../LiveDot';
import { mapGroupOrder } from '../data-mappers';
import type { Group } from '../types';


export default function ScreenGroupDetail() {
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
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (!g) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Groupe introuvable</div>;
  }

  const pct = Math.round((g.currentQty / g.targetQty) * 100);
  const remaining = g.targetQty - g.currentQty;
  const participants = [
    { i: "AD", n: "Amadou D.", q: 12, t: "il y a 5min" },
    { i: "FN", n: "Fatima N.", q: 8, t: "il y a 12min" },
    { i: "OS", n: "Omar S.", q: 20, t: "il y a 32min" },
    { i: "MK", n: "Mame K.", q: 5, t: "il y a 1h" },
    { i: "IB", n: "Ibrahim B.", q: 15, t: "il y a 2h" },
    { i: "AN", n: "Awa N.", q: 3, t: "il y a 3h" },
  ];
  const messages = [
    { i: "AD", n: "Amadou D.", m: "Livraison à Dakar prévue quand ?", t: "10:24" },
    { i: "DDM", n: "DDM+ Support", m: "Bonjour ! 4-7 jours après clôture du groupe.", t: "10:26", staff: true },
    { i: "FN", n: "Fatima N.", m: "Parfait, je prends 8 pour mon commerce.", t: "10:31" },
    { i: "OS", n: "Omar S.", m: "J'ai déjà commandé 20 unités, matériel top.", t: "11:02" },
  ];

  const copy = () => {
    setCopied(true);
    setTimeout(()=>setCopied(false), 1500);
  };

  const shareUrl = "market.itvisionplus.sn/g/" + g.id;

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

        <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
          <b className="text-violet-700 dark:text-violet-300">3 personnes</b> ont rejoint dans la dernière heure.
        </p>
      </div>
    </Card>
  );

  const JoinForm = () => (
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
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-600 dark:text-slate-400">Prix groupe</span>
          <span className="font-bold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}/pc</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-slate-600 dark:text-slate-400">Sous-total</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatFcfa(g.unit * qty)}</span>
        </div>
        <div className="mt-1 flex justify-between text-[12px]">
          <span className="text-emerald-700 dark:text-emerald-300">Économie vs. seul</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">-{formatFcfa((g.base - g.unit) * qty)}</span>
        </div>
      </div>

      <Button variant="violet" size="lg" className="mt-3 w-full">Rejoindre pour {qty} pcs</Button>
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
        <Button variant="secondary" size="sm"><Icon name="whatsapp" size={13}/>WhatsApp</Button>
        <Button variant="secondary" size="sm">Facebook</Button>
        <Button variant="secondary" size="sm">SMS</Button>
      </div>
    </Card>
  );

  const ParticipantsList = () => (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Participants <span className="text-slate-400 dark:text-slate-500 tabular-nums font-normal">· {g.participants}</span></h3>
        <Link href="/achats-groupes" className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">Tous</Link>
      </div>
      <div className="mt-3 space-y-2">
        {participants.map((p)=>(
          <div key={p.i} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[11px] font-extrabold text-white">{p.i}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 dark:text-white">{p.n}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.t}</p>
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
      <div className="max-h-72 space-y-3 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950">
        {messages.map((m,i)=>(
          <div key={i} className="flex items-start gap-2">
            <span className={cn("grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white", m.staff ? "bg-emerald-600" : "bg-gradient-to-br from-violet-500 to-emerald-500")}>{m.i}</span>
            <div className={cn("min-w-0 flex-1 rounded-2xl px-3 py-2", m.staff ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900" : "bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800")}>
              <div className="flex items-baseline gap-2">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white">{m.n}</p>
                {m.staff && <Badge tone="emerald" className="!text-[9px] !px-1 !py-0">Support</Badge>}
                <span className="text-[10px] text-slate-400">{m.t}</span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-700 dark:text-slate-300">{m.m}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 p-2 dark:border-slate-800">
        <input placeholder="Écrire un message…" className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"/>
        <button className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"><Icon name="send" size={16}/></button>
      </div>
    </Card>
  );

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Hero */}
          <div className="bg-white dark:bg-slate-900">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <Image src={g.image} alt={g.name} fill sizes="100vw" className="object-cover" priority />
              <div className="absolute left-3 top-3"><Badge tone="violet"><Icon name="users" size={11}/> Achat groupé</Badge></div>
              <div className="absolute right-3 top-3"><CountdownChip time={g.deadline} urgent={g.status==="almost"}/></div>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{g.category}</p>
              <h1 className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{g.name}</h1>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[28px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
                <span className="text-[13px] font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(g.base)}</span>
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">-{g.save}%</span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Prix débloqué à la clôture du groupe</p>
            </div>
          </div>

          <div className="mt-2 bg-white p-4 dark:bg-slate-900">
            <ProgressPanel/>
          </div>

          <Section title="Comment ça marche ?" className="mt-2 py-4 bg-white dark:bg-slate-900">
            <HowItWorks/>
          </Section>

          <Section title="Rejoindre" className="mt-2 py-4 bg-white dark:bg-slate-900">
            <JoinForm/>
          </Section>

          <Section title="Inviter" className="mt-2 py-4 bg-white dark:bg-slate-900">
            <ShareCard/>
          </Section>

          <Section className="mt-2 py-4 bg-white dark:bg-slate-900">
            <ParticipantsList/>
          </Section>

          <Section className="mt-2 py-4 bg-white dark:bg-slate-900">
            <ChatBox/>
          </Section>

          <div className="px-4 py-4">
            <TrustStrip compact/>
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{g.currentQty}/{g.targetQty} pcs · {pct}%</p>
              <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
                <p className="text-[16px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</p>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{g.save}%</p>
              </div>
            </div>
            <Button variant="violet" size="md" className="whitespace-nowrap flex-shrink-0">Rejoindre</Button>
          </div>
        </div>
      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <a>Accueil</a><Icon name="chevronRight" size={12}/><a>Achats groupés</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">{g.name}</span>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  <Image src={g.image} alt={g.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  <div className="absolute left-4 top-4"><Badge tone="violet"><Icon name="users" size={11}/> Achat groupé</Badge></div>
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{g.category}</p>
                  <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{g.name}</h1>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
                    <span className="text-base font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(g.base)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prix débloqué à la clôture du groupe · Économie -{g.save}%</p>
                  <div className="mt-6">
                    <ProgressPanel/>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-base font-extrabold text-slate-900 dark:text-white">Comment ça marche ?</h2>
              <HowItWorks/>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <ParticipantsList/>
              <ChatBox/>
            </div>

            <TrustStrip/>
          </div>

          <div>
            <div className="sticky top-20 space-y-4">
              <JoinForm/>
              <ShareCard/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
