'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ScreenOrderDetail from '@/components/market/batch1/screens/ScreenOrderDetail';

interface OrderDetails {
  orderId: string
  clientName: string
  clientEmail?: string
  clientPhone: string
  items: any[]
  subtotal: number
  subtotalBeforeDiscounts?: number
  shipping: any
  total: number
  status: string
  paymentStatus: string
  address: any
  delivery?: {
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
    estimatedDeliveryDate?: string
    status?: string
    lastUpdate?: string
  }
  createdAt: string
  currency: string
  fees?: {
    supplierCost: number
    serviceFeeRate: number
    serviceFeeStandardRate: number
    serviceFeeAmount: number
    serviceFeeSavings: number
    insuranceRate: number
    insuranceAmount: number
    totalFees: number
    quantityDiscount?: { percent: number; amount: number; label: string }
  }
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.orderId as string;
  const token = searchParams?.get('token') || searchParams?.get('t') || null;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const url = token
          ? `/api/order/${orderId}?token=${encodeURIComponent(token)}`
          : `/api/order/${orderId}`;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-8 shadow max-w-md border border-slate-200 dark:border-slate-800">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 dark:text-white">Commande introuvable</h1>
          <p className="text-slate-600 dark:text-slate-400">{error || 'Impossible de charger la commande.'}</p>
          <Link href="/compte/commandes" className="mt-4 inline-flex items-center gap-1 text-emerald-600 font-medium">
            <ArrowLeft size={16} /> Mes commandes
          </Link>
        </div>
      </div>
    );
  }

  return <ScreenOrderDetail order={order} token={token} />;
}
