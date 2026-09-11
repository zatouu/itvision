'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ScreenFormRequest, { FormRequestData } from '@/components/market/batch1/screens/ScreenFormRequest';

function parseTrackingInput(input: string): { orderId?: string; token?: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Veuillez saisir un lien ou un ID de commande.' };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const token = url.searchParams.get('token') || url.searchParams.get('t') || undefined;
      const parts = url.pathname.split('/').filter(Boolean);
      const commandesIndex = parts.findIndex((p) => p === 'commandes');
      const orderId = commandesIndex >= 0 ? parts[commandesIndex + 1] : undefined;
      if (!orderId) return { error: 'Impossible de trouver l’ID de commande dans ce lien.' };
      return { orderId, token };
    } catch {
      // fallthrough
    }
  }

  if (trimmed.startsWith('/')) {
    try {
      const url = new URL(trimmed, 'https://local.example');
      const token = url.searchParams.get('token') || url.searchParams.get('t') || undefined;
      const parts = url.pathname.split('/').filter(Boolean);
      const commandesIndex = parts.findIndex((p) => p === 'commandes');
      const orderId = commandesIndex >= 0 ? parts[commandesIndex + 1] : undefined;
      if (!orderId) return { error: 'Impossible de trouver l’ID de commande dans ce lien.' };
      return { orderId, token };
    } catch {
      // fallthrough
    }
  }

  return { orderId: trimmed };
}

export default function ReclamerCommandePage() {
  const router = useRouter();
  const [tokenOverride, setTokenOverride] = useState('');

  const handleSubmit = async (data: FormRequestData) => {
    const parsed = parseTrackingInput(data.reference);
    if (parsed.error) {
      return { success: false, error: parsed.error };
    }
    const orderId = parsed.orderId;
    if (!orderId) {
      return { success: false, error: 'ID de commande manquant.' };
    }
    const token = tokenOverride.trim() || parsed.token;
    if (!token) {
      return { success: false, error: 'Token manquant. Collez le lien de suivi complet, ou saisissez le token.' };
    }

    try {
      const res = await fetch(`/api/order/${encodeURIComponent(orderId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: result?.error || 'Impossible de réclamer la commande.' };
      }
      return {
        success: true,
        reference: orderId,
        message: result?.alreadyClaimed ? 'Commande déjà associée à votre compte.' : 'Commande associée à votre compte avec succès.',
      };
    } catch {
      return { success: false, error: 'Erreur réseau. Réessayez.' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-2">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
      <ScreenFormRequest
        variant="reclamation"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/compte')}
      />
      {/* Hidden token override injected as a note; UI can be improved later */}
      <div className="mx-auto max-w-2xl px-4 md:px-6 -mt-20 pb-32">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Token (si non inclus dans le lien)</label>
        <input
          value={tokenOverride}
          onChange={(e) => setTokenOverride(e.target.value)}
          placeholder="Token de suivi"
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>
    </div>
  );
}
