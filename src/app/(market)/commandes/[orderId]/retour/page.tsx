'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Package } from 'lucide-react';
import ScreenFormRequest, { FormRequestData } from '@/components/market/batch1/screens/ScreenFormRequest';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface OrderDetails {
  orderId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  items: OrderItem[];
  total: number;
  status: string;
  paymentStatus: string;
}

export default function ReturnRequestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  const token = searchParams?.get('token') || searchParams?.get('t');

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const url = `/api/order/${orderId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Commande introuvable');
        setOrder(data.order);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, token]);

  const handleSubmit = async (data: FormRequestData) => {
    if (!order) return { success: false, error: 'Commande non chargée' };

    const items = order.items
      .filter((item) => (data.selectedItems[item.id] || 0) > 0)
      .map((item) => ({ productId: item.id, name: item.name, qty: data.selectedItems[item.id] }));

    if (items.length === 0) {
      return { success: false, error: 'Veuillez sélectionner au moins un article à retourner' };
    }

    try {
      const res = await fetch(`/api/returns${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          orderReference: order.orderId,
          items,
          reason: data.reason,
          details: data.details,
          photos: data.photos,
          phone: data.phone,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création de la demande');
      return { success: true, reference: result.reference || `DEM-${Date.now()}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-8 shadow max-w-md border border-slate-200 dark:border-slate-800">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 dark:text-white">Erreur</h1>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <Link href={`/commandes/${orderId}`} className="mt-4 inline-flex items-center gap-1 text-emerald-600 font-medium">
            <ArrowLeft size={16} /> Retour à la commande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-2">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            <ArrowLeft size={16} /> Retour
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Package size={16} /> Demande de retour
          </span>
        </div>
      </div>
      <ScreenFormRequest
        variant="retour"
        reference={order?.orderId}
        totalPaid={order?.total}
        items={order?.items.map((it) => ({ ...it, image: undefined, variant: undefined }))}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/commandes/${orderId}${token ? `?token=${token}` : ''}`)}
        externalError={error}
      />
    </div>
  );
}
