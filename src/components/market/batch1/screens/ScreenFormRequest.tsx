'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Info,
  HelpCircle,
  RefreshCw,
  Package,
  Clock,
  Check,
  Minus,
  Plus,
  Wallet,
  Upload,
  Send,
  X,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';

interface FormItem {
  id: string
  name: string
  qty: number
  price: number
  image?: string
  variant?: string
}

export interface FormRequestData {
  reference: string
  reason: string
  details: string
  urgency: 'low' | 'normal' | 'high'
  refundOrExchange: 'refund' | 'exchange'
  selectedItems: Record<string, number>
  phone: string
  photos: string[]
}

interface ScreenFormRequestProps {
  variant: 'litige' | 'reclamation' | 'retour'
  reference?: string
  totalPaid?: number
  items?: FormItem[]
  onSubmit: (data: FormRequestData) => Promise<{ success: boolean; reference?: string; error?: string; message?: string }>
  onCancel?: () => void
  loading?: boolean
  externalError?: string | null
  successTitle?: string
  successMsg?: string
}

const VARIANTS = {
  litige: {
    label: 'Ouvrir un litige',
    icon: Info,
    tone: 'red' as const,
    hero: 'Un problème avec votre commande ?',
    sub: 'Notre équipe traite votre litige sous 24h ouvrées.',
    referencePrefilled: true,
    showItems: false,
    showRefundChoice: false,
    showUrgency: true,
    showPhotos: true,
    reasons: [
      { k: 'not_received', l: 'Commande jamais reçue' },
      { k: 'damaged', l: 'Produits endommagés à la livraison' },
      { k: 'wrong_item', l: 'Mauvais article reçu' },
      { k: 'missing_item', l: 'Articles manquants' },
      { k: 'not_conform', l: 'Non conforme à la description' },
      { k: 'other', l: 'Autre' },
    ],
    submitLabel: 'Ouvrir le litige',
    successTitle: 'Litige enregistré',
    successMsg: 'Un conseiller vous contactera sous 24h ouvrées. Vous pouvez suivre l\'avancement dans Mes commandes.',
  },
  reclamation: {
    label: 'Réclamer une commande',
    icon: HelpCircle,
    tone: 'amber' as const,
    hero: 'Je réclame une commande passée',
    sub: 'Une commande n\'apparaît pas dans votre historique ? Réclamez-la ici.',
    referencePrefilled: false,
    showItems: false,
    showRefundChoice: false,
    showUrgency: true,
    showPhotos: true,
    reasons: [
      { k: 'missing_order', l: 'Commande absente de mon historique' },
      { k: 'wrong_account', l: 'Commande créée sur le mauvais compte' },
      { k: 'payment_pending', l: 'Paiement fait mais commande non confirmée' },
      { k: 'other', l: 'Autre' },
    ],
    submitLabel: 'Envoyer la réclamation',
    successTitle: 'Réclamation reçue',
    successMsg: 'Notre équipe vérifie et vous répond sous 24h ouvrées par SMS et WhatsApp.',
  },
  retour: {
    label: 'Demander un retour',
    icon: RefreshCw,
    tone: 'violet' as const,
    hero: 'Demander un retour ou un échange',
    sub: 'Sous 7 jours après réception. On vous rembourse via le mode de paiement d\'origine.',
    referencePrefilled: true,
    showItems: true,
    showRefundChoice: true,
    showUrgency: false,
    showPhotos: true,
    reasons: [
      { k: 'defective', l: 'Produit défectueux' },
      { k: 'not_as_described', l: 'Non conforme à la description' },
      { k: 'wrong_size', l: 'Ne me convient pas' },
      { k: 'damaged_ship', l: 'Endommagé pendant la livraison' },
      { k: 'changed_mind', l: 'J\'ai changé d\'avis' },
    ],
    submitLabel: 'Envoyer la demande de retour',
    successTitle: 'Demande de retour envoyée',
    successMsg: 'Notre équipe organise le retour avec vous sous 24h. Un lien de suivi vous sera envoyé.',
  },
};

export default function ScreenFormRequest({
  variant,
  reference: initialReference = '',
  totalPaid,
  items = [],
  onSubmit,
  onCancel,
  loading: externalLoading,
  externalError,
  successTitle: successTitleProp,
  successMsg: successMsgProp,
}: ScreenFormRequestProps) {
  const router = useRouter();
  const v = VARIANTS[variant];
  const Icon = v.icon;

  const [reference, setReference] = useState(initialReference);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal');
  const [refundOrExchange, setRefundOrExchange] = useState<'refund' | 'exchange'>('refund');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((it) => { initial[it.id] = it.qty; });
    return initial;
  });
  const [phone, setPhone] = useState('');
  const [photos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(externalError || null);
  const [success, setSuccess] = useState(false);
  const [successRef, setSuccessRef] = useState('');
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);

  const selectedTotal = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const item = items.find((i) => i.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [selectedItems, items]);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      const item = items.find((i) => i.id === id);
      if (next[id] && next[id] > 0) {
        next[id] = 0;
      } else {
        next[id] = item?.qty || 1;
      }
      return next;
    });
  };

  const updateQty = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSelectedItems((prev) => {
      const next = { ...prev };
      next[id] = Math.max(0, Math.min((next[id] || 0) + delta, item.qty));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!v.referencePrefilled && !reference.trim()) {
      setError('Veuillez renseigner la référence de la commande.');
      return;
    }
    if (v.showItems) {
      const hasSelection = Object.values(selectedItems).some((q) => q > 0);
      if (!hasSelection) {
        setError('Veuillez sélectionner au moins un article.');
        return;
      }
    }
    if (!reason) {
      setError('Veuillez sélectionner un motif.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        reference: v.referencePrefilled ? initialReference : reference,
        reason,
        details,
        urgency,
        refundOrExchange,
        selectedItems,
        phone,
        photos,
      });
      if (result.success) {
        setSuccess(true);
        setSuccessRef(result.reference || `DEM-2026-${Math.floor(Math.random() * 9000 + 1000)}`);
        setCustomSuccessMsg(result.message || null);
      } else {
        setError(result.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const toneBg = {
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  };

  const borderTone = {
    red: 'border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900',
    amber: 'border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900',
    violet: 'border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-900',
  };

  const textTone = {
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-700 dark:text-amber-400',
    violet: 'text-violet-700 dark:text-violet-400',
  };

  const urgencyOptions = [
    { k: 'low' as const, l: 'Faible', tone: 'slate' as const },
    { k: 'normal' as const, l: 'Normal', tone: 'emerald' as const },
    { k: 'high' as const, l: 'Urgent', tone: 'red' as const },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Check size={44} strokeWidth={3.5} />
          </div>
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Envoyé avec succès</p>
        <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">{successTitleProp || v.successTitle}</h2>
        <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 max-w-md text-center">{customSuccessMsg || successMsgProp || v.successMsg}</p>
        <p className="mt-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">Réf. {successRef}</p>

        <div className="mt-6 w-full max-w-sm flex gap-2 flex-col sm:flex-row">
          <button
            onClick={() => { setSuccess(false); setReason(''); setDetails(''); setPhone(''); setCustomSuccessMsg(null); }}
            className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition"
          >
            Nouvelle demande
          </button>
          <Link
            href="/compte/commandes"
            className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center justify-center"
          >
            Voir mes commandes
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = externalLoading || submitting;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 md:px-6">
        <div className="mx-auto max-w-2xl flex items-start gap-3">
          <span className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl', toneBg[v.tone])}>
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{v.label}</p>
            <p className="mt-0.5 font-extrabold text-slate-900 dark:text-white leading-tight text-[17px] md:text-[22px]">{v.hero}</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-snug">{v.sub}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl p-4 md:px-6 space-y-4">
        {(error) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3 flex items-start gap-2 text-[12px] text-red-800 dark:text-red-200">
            <X size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Référence */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Référence de la commande</label>
          {v.referencePrefilled ? (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"><Package size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{initialReference}</p>
                {typeof totalPaid === 'number' && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Total payé : <b className="text-slate-900 dark:text-white tabular-nums">{formatFcfa(totalPaid)}</b></p>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Pré-rempli</span>
            </div>
          ) : (
            <>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="CMD-2026-XXXX"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono uppercase"
              />
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Le numéro figure dans votre email de confirmation ou par SMS.</p>
            </>
          )}
        </div>

        {/* Articles (retour) */}
        {v.showItems && items.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Article(s) à retourner</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Sélectionnez les articles concernés</p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((it) => {
                const active = (selectedItems[it.id] || 0) > 0;
                const qty = selectedItems[it.id] || 0;
                return (
                  <div key={it.id} className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <button type="button" onClick={() => toggleItem(it.id)} className={cn('grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border-2', active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600')}>
                      {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                    {it.image && <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{it.qty} pcs · {formatFcfa(it.price * it.qty)}</p>
                    </div>
                    {active && (
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updateQty(it.id, -1)} className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Minus size={11} /></button>
                        <span className="w-6 text-center text-[11px] font-extrabold tabular-nums">{qty}</span>
                        <button type="button" onClick={() => updateQty(it.id, 1)} className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Plus size={11} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {Object.values(selectedItems).some((q) => q > 0) && (
              <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-baseline justify-between text-[11px] bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{Object.entries(selectedItems).filter(([, q]) => q > 0).length} article(s) sélectionné(s)</span>
                <span className="font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatFcfa(selectedTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Motif */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Motif</p>
          <div className="space-y-1.5">
            {v.reasons.map((r) => (
              <button
                key={r.k}
                type="button"
                onClick={() => setReason(r.k)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  reason === r.k ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                )}
              >
                <span className={cn('grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2', reason === r.k ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600')}>
                  {reason === r.k && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className={cn('text-[12px] font-semibold', reason === r.k ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>{r.l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Remboursement / Échange */}
        {v.showRefundChoice && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Vous souhaitez</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'refund' as const, l: 'Remboursement', i: Wallet, sub: 'Sous 5-7 jours ouvrés' },
                { k: 'exchange' as const, l: 'Échange', i: RefreshCw, sub: 'Article de remplacement' },
              ].map((o) => {
                const active = refundOrExchange === o.k;
                const IconComp = o.i;
                return (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setRefundOrExchange(o.k)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all',
                      active ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('grid h-8 w-8 place-items-center rounded-lg', active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
                        <IconComp size={14} />
                      </span>
                      <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">{o.l}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{o.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Urgence */}
        {v.showUrgency && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Niveau d&apos;urgence</p>
            <div className="grid grid-cols-3 gap-2">
              {urgencyOptions.map((u) => (
                <button
                  key={u.k}
                  type="button"
                  onClick={() => setUrgency(u.k)}
                  className={cn(
                    'rounded-xl border-2 py-2.5 text-[12px] font-bold transition-all',
                    urgency === u.k
                      ? u.k === 'high' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                        : u.k === 'normal' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                        : 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-300'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  )}
                >
                  {u.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
          <textarea
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Décrivez le problème avec un maximum de détails…"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
          />
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Plus votre description est précise, plus notre équipe traite votre demande rapidement.</p>
        </div>

        {/* Photos */}
        {v.showPhotos && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Pièces jointes (optionnel)</p>
            <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 text-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
              <div className="grid h-10 w-10 mx-auto place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-2">
                <Upload size={18} />
              </div>
              <p className="text-[12px] font-bold text-slate-900 dark:text-white">Ajouter des photos ou vidéos</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Jusqu&apos;à 5 fichiers · JPG, PNG, MP4 · max 10 Mo chacun</p>
            </div>
          </div>
        )}

        {/* Téléphone */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Téléphone pour vous joindre</label>
          <div className="mt-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">🇸🇳 +221</span>
            <Smartphone size={14} className="text-slate-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="77 123 45 67"
              className="h-11 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white tabular-nums"
            />
          </div>
        </div>

        {/* SLA banner */}
        <div className={cn('rounded-2xl border p-3 flex items-start gap-2', borderTone[v.tone])}>
          <Clock size={16} className={cn('flex-shrink-0 mt-0.5', textTone[v.tone])} />
          <p className={cn('text-[11px] leading-relaxed', textTone[v.tone].replace('text-', 'text-').replace('dark:text-', 'dark:text-'))}>
            <b className="block mb-0.5">Réponse sous 24h ouvrées.</b>
            Vous serez notifié par SMS et WhatsApp dès qu&apos;un conseiller prend en charge votre demande.
          </p>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl flex gap-2">
          <button
            type="button"
            onClick={onCancel || (() => router.back())}
            className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            {v.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
