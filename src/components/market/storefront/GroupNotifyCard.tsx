'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Icon } from './Icon';
import { Button } from './Button';

interface GroupNotifyCardProps {
  productId?: string;
  className?: string;
}

/**
 * « Préviens-moi » — l'utilisateur manifeste son intérêt pour un achat groupé
 * sur ce produit (ou en général si productId absent). Idempotent côté serveur.
 */
export function GroupNotifyCard({ productId, className }: GroupNotifyCardProps) {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'already' | 'error'>('idle');
  const [error, setError] = useState('');
  const [interested, setInterested] = useState(0);

  useEffect(() => {
    fetch(`/api/group-orders/interests${productId ? `?productId=${productId}` : ''}`)
      .then(r => r.json())
      .then(d => { if (typeof d?.count === 'number') setInterested(d.count); })
      .catch(() => {});
  }, [productId]);

  const submit = async () => {
    const clean = phone.replace(/\s/g, '').replace(/^(221|00221)/, '');
    if (!clean) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/group-orders/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, phone: `+221 ${clean}` }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setStatus('error');
        setError(data?.error || 'Impossible d\'enregistrer ton numéro.');
        return;
      }
      setStatus(data.already ? 'already' : 'done');
      if (!data.already) setInterested(c => c + 1);
    } catch {
      setStatus('error');
      setError('Impossible de contacter le serveur.');
    }
  };

  const done = status === 'done' || status === 'already';

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <Icon name="bell" size={15} />
        </span>
        <div>
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
            {productId ? 'Ce produit en achat groupé ?' : 'Être prévenu des prochains groupes'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {interested > 0
              ? `${interested} personne${interested > 1 ? 's' : ''} intéressée${interested > 1 ? 's' : ''}`
              : 'On te notifie dès qu\'un groupe est lancé.'}
          </p>
        </div>
      </div>

      {done ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-center text-[12px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {status === 'already' ? '✓ Tu es déjà inscrit' : '✓ Tu seras prévenu lorsqu\'un groupe sera créé'}
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">+221</span>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
              placeholder="77 123 45 67"
              inputMode="tel"
              className="h-10 flex-1 bg-transparent px-2 text-sm outline-none dark:text-white dark:placeholder-slate-500"
            />
          </div>
          {status === 'error' && error && (
            <p className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button
            variant="violet"
            size="sm"
            className="mt-2 w-full"
            disabled={status === 'loading' || !phone.trim()}
            onClick={() => void submit()}
          >
            {status === 'loading' ? 'Envoi…' : 'Préviens-moi'}
          </Button>
        </div>
      )}
    </Card>
  );
}
