'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Camera, Link as LinkIcon, FileText, Upload, Loader2, CheckCircle, AlertCircle, Clock, Package, Search, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from './formatFcfa';
import { useSourcingModal } from './SourcingModalContext';

const SOURCE_TABS = [
  { key: 'photo', label: 'Photo', icon: Camera, accept: 'image/*' },
  { key: 'link', label: 'Lien', icon: LinkIcon },
  { key: 'text', label: 'Texte', icon: FileText },
] as const;

type SourceType = (typeof SOURCE_TABS)[number]['key'];

interface SourcingResult {
  success: boolean;
  request?: {
    id: string;
    reference: string;
    publicToken: string;
    trackUrl: string;
  };
  needsContact?: boolean;
  catalogMatch?: {
    id: string;
    name: string;
    image?: string;
    price?: number;
    slug?: string;
  };
  error?: string;
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, '').replace(/^\+?/, '+');
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function SourcingRequestModal() {
  const { isOpen, close } = useSourcingModal();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'needsContact' | 'catalogMatch' | 'error'>('form');
  const [source, setSource] = useState<SourceType>('photo');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [budget, setBudget] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SourcingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reset = useCallback(() => {
    setStep('form');
    setSource('photo');
    setDescription('');
    setTitle('');
    setQty(1);
    setBudget('');
    setDeadline('');
    setContactPhone('');
    setContactName('');
    setContactEmail('');
    setFile(null);
    setPreview(null);
    setExternalUrl('');
    setResult(null);
    setErrorMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    close();
    setTimeout(reset, 200);
  }, [close, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) {
      setErrorMsg('Format d\'image non supporté (jpg, png, webp, gif)');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setErrorMsg('Image trop volumineuse (max 8 Mo)');
      return;
    }
    setFile(f);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const validate = () => {
    if (source === 'photo' && !file) return 'Veuillez ajouter une photo.';
    if (source === 'link' && !isValidUrl(externalUrl)) return 'Veuillez fournir un lien valide.';
    if (!description.trim() && !title.trim()) return 'Veuillez décrire votre demande.';
    if (Number(qty) < 1) return 'La quantité doit être d\'au moins 1.';
    if (!contactPhone.trim()) return 'Un numéro de téléphone est requis.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setErrorMsg(v);
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        source,
        description: description.trim() || title.trim(),
        title: title.trim() || undefined,
        qty: Number(qty) || 1,
        budgetMaxFCFA: budget ? Number(budget) : undefined,
        deliveryNeededBy: deadline || undefined,
        contactPhone: normalizePhone(contactPhone),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        externalUrl: source === 'link' ? externalUrl.trim() : undefined,
      };

      let res: Response;
      if (source === 'photo' && file) {
        const body = new FormData();
        body.append('payload', JSON.stringify(payload));
        body.append('image', file);
        res = await fetch('/api/market/sourcing', { method: 'POST', body });
      } else {
        res = await fetch('/api/market/sourcing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok || data.error) {
        setStep('error');
        setErrorMsg(data.error || 'Une erreur est survenue lors de l\'envoi.');
        return;
      }

      if (data.catalogMatch) {
        setStep('catalogMatch');
        setResult({ success: true, catalogMatch: data.catalogMatch });
        return;
      }

      if (data.needsContact) {
        setStep('needsContact');
        setResult({ success: true, needsContact: true });
        return;
      }

      setStep('success');
      setResult({ success: true, request: data.request });
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message || 'Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const StepPill = ({ icon: Icon, n, label }: { icon: any; n: number; label: string }) => (
    <div className="flex flex-col items-center gap-1.5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
        <Icon size={14} />
      </span>
      <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300">{label}</span>
    </div>
  );

  const Arrow = () => <ChevronRight size={16} className="text-violet-300 dark:text-violet-700 mt-[-10px]" />;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />

      <div className={cn(
        'relative z-10 w-full max-w-full md:max-w-[560px] bg-white dark:bg-slate-900 shadow-2xl overflow-hidden',
        'rounded-t-3xl md:rounded-2xl',
        'max-h-[92vh] md:max-h-[90vh] flex flex-col'
      )}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Camera size={20} />
            </span>
            <div>
              <p className="text-[15px] font-extrabold text-slate-900 dark:text-white">Sourcing sur demande</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Trouvez-moi ce produit</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Step pills */}
          {step === 'form' && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <StepPill icon={Camera} n={1} label="Photo/Lien/Texte" />
              <Arrow />
              <StepPill icon={Clock} n={2} label="Devis 24h" />
              <Arrow />
              <StepPill icon={Package} n={3} label="Commande" />
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source tabs */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {SOURCE_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => { setSource(t.key); setErrorMsg(null); }}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition',
                        source === t.key
                          ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-950 dark:text-violet-300'
                          : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Photo upload */}
              {source === 'photo' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'relative w-full rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-800 p-5 text-center transition',
                      'bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40',
                      preview ? 'border-solid' : 'border-dashed'
                    )}
                  >
                    {preview ? (
                      <img src={preview} alt="Aperçu" className="mx-auto h-32 w-auto rounded-xl object-contain" />
                    ) : (
                      <>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 mb-2">
                          <Upload size={22} />
                        </div>
                        <p className="text-[13px] font-bold text-violet-700 dark:text-violet-300">Télécharger une photo</p>
                        <p className="text-[11px] text-violet-600/70 dark:text-violet-300/70">ou glisser-déposer · jpg, png, webp, gif</p>
                      </>
                    )}
                  </button>
                  {preview && (
                    <button
                      type="button"
                      onClick={() => { setFile(null); setPreview(null); }}
                      className="mt-2 text-[11px] text-red-600 underline"
                    >
                      Supprimer l&apos;image
                    </button>
                  )}
                </div>
              )}

              {/* Link input */}
              {source === 'link' && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lien du produit</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                    <LinkIcon size={16} className="text-slate-400" />
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-transparent text-[13px] text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Description / title */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez le produit recherché (marque, modèle, couleur, spécificités…)"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Titre court (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: iPhone 15 Pro 256Go"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Grid qty / budget / deadline */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Qté</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget/pc</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="FCFA"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Délai</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vos coordonnées</p>
                <div>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Téléphone *"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Prénom / Nom"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-[13px] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-[12px] text-red-700 dark:text-red-300">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5 text-center">
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">24h ouvrées · sans engagement</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Envoyer la demande
                </button>
              </div>
            </form>
          )}

          {step === 'success' && result?.request && (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white">Demande envoyée !</h3>
              <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                Référence <span className="font-mono font-bold">{result.request.reference}</span>
              </p>
              <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                Vous recevrez une proposition sous 24h ouvrées par SMS.
              </p>
              <Link
                href={result.request.trackUrl}
                onClick={handleClose}
                className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition"
              >
                Suivre ma demande <ChevronRight size={16} />
              </Link>
              <button
                onClick={handleClose}
                className="mt-3 block w-full text-[12px] text-slate-500 underline"
              >
                Fermer
              </button>
            </div>
          )}

          {step === 'needsContact' && (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white">Vérification en cours</h3>
              <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
                Nous avons besoin d&apos;un numéro de téléphone valide pour vous notifier. Veuillez le renseigner et réessayer.
              </p>
              <button
                onClick={() => setStep('form')}
                className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition"
              >
                Revenir au formulaire
              </button>
            </div>
          )}

          {step === 'catalogMatch' && result?.catalogMatch && (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3">
                <Search size={24} />
              </div>
              <h3 className="text-[16px] font-extrabold text-slate-900 dark:text-white">Produit trouvé dans notre catalogue</h3>
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <img
                  src={result.catalogMatch.image || '/placeholder.svg'}
                  alt={result.catalogMatch.name}
                  className="h-32 w-auto mx-auto rounded-xl object-cover mb-3 bg-slate-100 dark:bg-slate-800"
                />
                <p className="font-bold text-slate-900 dark:text-white">{result.catalogMatch.name}</p>
                {typeof result.catalogMatch.price === 'number' && (
                  <p className="text-emerald-600 font-extrabold mt-1">{formatFcfa(result.catalogMatch.price)}</p>
                )}
                <Link
                  href={result.catalogMatch.slug ? `/produits/${result.catalogMatch.slug}` : `/produits/${result.catalogMatch.id}`}
                  onClick={handleClose}
                  className="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition"
                >
                  Voir le produit <ChevronRight size={14} />
                </Link>
              </div>
              <button onClick={handleClose} className="mt-3 text-[12px] text-slate-500 underline">Fermer</button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white">Échec de l&apos;envoi</h3>
              <p className="mt-2 text-[13px] text-red-700 dark:text-red-300">{errorMsg}</p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => setStep('form')}
                  className="h-10 px-4 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 transition"
                >
                  Réessayer
                </button>
                <button
                  onClick={handleClose}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-900 dark:text-white dark:border-slate-700 text-[13px] font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
