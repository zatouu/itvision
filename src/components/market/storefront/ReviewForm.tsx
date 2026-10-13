'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';

type PostedReview = { id: string; userName: string; rating: number; title?: string | null; comment: string; verified: boolean; createdAt: string };

export function ReviewForm({ productId, onPosted }: { productId: string; onPosted?: (review: PostedReview) => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [needLogin, setNeedLogin] = useState(false);
  const [done, setDone] = useState<null | { verified: boolean }>(null);

  if (done) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] md:text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        {done.verified
          ? 'Merci ! Votre avis est publié avec la mention « Achat vérifié ».'
          : 'Merci ! Votre avis sera publié après vérification par notre équipe.'}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-slate-300 p-3 text-[12px] md:text-sm font-bold text-violet-700 hover:bg-violet-50 dark:border-slate-700 dark:text-violet-300 dark:hover:bg-violet-950/30"
      >
        Donner mon avis sur ce produit
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return setError('Choisissez une note.');
    if (comment.trim().length < 10) return setError('Votre commentaire doit faire au moins 10 caractères.');
    setSending(true); setError(''); setNeedLogin(false);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title: title.trim() || undefined, comment: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { setNeedLogin(true); return; }
      if (!res.ok || !data.success) throw new Error(data.error || 'Envoi impossible');
      setDone({ verified: !!data.review?.verified });
      if (data.review?.verified) onPosted?.(data.review);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div>
        <p className="mb-1 text-[12px] md:text-sm font-bold text-slate-900 dark:text-white">Votre note</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} sur 5`}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Icon name="star" size={24} strokeWidth={0} className={n <= rating ? 'fill-amber-500' : 'fill-slate-200 dark:fill-slate-700'} />
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Titre (facultatif)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={4}
        maxLength={1500}
        placeholder="Qualité, conformité à la description, délai de livraison…"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {needLogin && (
        <p className="text-[12px] text-slate-600 dark:text-slate-300">
          Connectez-vous pour publier votre avis.{' '}
          <Link href={`/login?redirect=${encodeURIComponent(`/produits/${productId}`)}`} className="font-bold text-violet-700 underline dark:text-violet-300">Se connecter</Link>
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Annuler</button>
        <button type="submit" disabled={sending} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {sending ? 'Envoi…' : 'Publier mon avis'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Les avis liés à un achat payé sur DDM+ sont publiés directement avec la mention « Achat vérifié » ; les autres sont relus avant publication.</p>
    </form>
  );
}
