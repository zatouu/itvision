'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import ScreenFormRequest, { FormRequestData } from '@/components/market/batch1/screens/ScreenFormRequest';

interface EscrowTransaction {
  reference: string;
  buyerName: string;
  buyerPhone: string;
  status: string;
  amount: number;
  productName: string;
  quantity: number;
  dispute?: {
    reason: string;
    description: string;
    photos: string[];
    openedAt: Date;
  };
}

export default function DisputePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = params?.reference as string;
  const token = searchParams?.get('token') || '';

  const [transaction, setTransaction] = useState<EscrowTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    // Référence commande marketplace : le litige passe par le flux retour
    if (reference.startsWith('CMD-')) {
      router.replace(`/commandes/${encodeURIComponent(reference)}/retour${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      return;
    }
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/escrow/${encodeURIComponent(reference)}`);
        if (!res.ok) throw new Error('Transaction non trouvée');
        const data = await res.json();
        setTransaction(data);
      } catch {
        setError('Transaction non trouvée');
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [reference]);

  const handleSubmit = async (data: FormRequestData) => {
    if (!transaction) return { success: false, error: 'Transaction non chargée' };

    try {
      const res = await fetch(`/api/escrow/${encodeURIComponent(reference)}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: data.reason,
          description: data.details,
          photos: data.photos,
          phoneLast4: data.phone.slice(-4),
          urgency: data.urgency,
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la soumission');
      return { success: true, reference: `LIT-${Date.now()}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erreur lors de la soumission' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-8 shadow max-w-md border border-slate-200 dark:border-slate-800">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 dark:text-white">Transaction non trouvée</h1>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
      <ScreenFormRequest
        variant="litige"
        reference={transaction?.reference || reference}
        totalPaid={transaction?.amount}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/suivi/${reference}`)}
      />
    </div>
  );
}
