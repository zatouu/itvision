'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, Home, FileText } from 'lucide-react'

interface OrderDetails {
  orderId: string
  clientName: string
  clientPhone: string
  items: any[]
  subtotal: number
  shipping: any
  total: number
  status: string
  paymentStatus: string
  address: any
  createdAt: string
  currency: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/order/${orderId}`)
        const data = await res.json()

        if (res.ok && data.success) {
          setOrder(data.order)
        } else {
          setError(data.error || 'Commande non trouvée')
        }
      } catch (e) {
        console.error(e)
        setError('Erreur lors de la récupération de la commande')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const formatCurrency = (amount: number, currency = 'FCFA') =>
    `${amount.toLocaleString('fr-FR')} ${currency}`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-900 mb-2">Erreur</h1>
          <p className="text-red-700 mb-4">{error || 'Commande non trouvée'}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* En-tête de confirmation */}
      <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-6 mb-6 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">Commande confirmée!</h1>
        <p className="text-emerald-700 mb-3">
          Merci pour votre achat. Voici les détails de votre commande.
        </p>
        <div className="text-2xl font-bold text-emerald-800">{order.orderId}</div>
      </div>

      {/* Détails commande */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Infos client */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Informations client</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Nom:</span>{' '}
              <span className="font-medium">{order.clientName}</span>
            </div>
            <div>
              <span className="text-gray-600">Téléphone:</span>{' '}
              <span className="font-medium">{order.clientPhone}</span>
            </div>
            <div>
              <span className="text-gray-600">Adresse de livraison:</span>
              <div className="font-medium mt-1">
                {order.address.street && <div>{order.address.street}</div>}
                {order.address.city && (
                  <div>
                    {order.address.postalCode} {order.address.city}
                  </div>
                )}
                {order.address.country && <div>{order.address.country}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Statut */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Statut de la commande</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Statut commande:</span>{' '}
              <span className={`font-medium px-2 py-1 rounded text-white ${
                order.status === 'pending' ? 'bg-yellow-600' :
                order.status === 'processing' ? 'bg-blue-600' :
                order.status === 'shipped' ? 'bg-blue-500' :
                order.status === 'delivered' ? 'bg-emerald-600' :
                'bg-gray-600'
              }`}>
                {order.status === 'pending' ? 'En attente de confirmation' :
                 order.status === 'processing' ? 'En cours de traitement' :
                 order.status === 'shipped' ? 'Expédié' :
                 order.status === 'delivered' ? 'Livré' :
                 order.status}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Paiement:</span>{' '}
              <span className={`font-medium px-2 py-1 rounded text-white ${
                order.paymentStatus === 'pending' ? 'bg-yellow-600' :
                order.paymentStatus === 'completed' ? 'bg-emerald-600' :
                'bg-red-600'
              }`}>
                {order.paymentStatus === 'pending' ? 'En attente' :
                 order.paymentStatus === 'completed' ? 'Payé' :
                 'Échec'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Date de commande:</span>{' '}
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé des produits */}
      <div className="rounded-lg border bg-white p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Produits commandés</h2>
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-b-0">
              <div>
                <div className="font-medium">{item.name}</div>
                {item.variantId && <div className="text-gray-600 text-xs">Variante: {item.variantId}</div>}
                <div className="text-gray-600">
                  Quantité: {item.qty} × {formatCurrency(item.price, item.currency)}
                </div>
              </div>
              <div className="text-right font-medium">
                {formatCurrency(item.price * item.qty, item.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Récapitulatif financier */}
      <div className="rounded-lg border bg-gray-50 p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Récapitulatif</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sous-total (produits avec frais):</span>
            <span>{formatCurrency(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Transport ({order.shipping.method}):</span>
            <span>{formatCurrency(order.shipping.totalCost, order.currency)}</span>
          </div>
          {order.shipping.totalWeight > 0 && (
            <div className="text-xs text-gray-600 ml-auto">
              Poids total: {order.shipping.totalWeight.toFixed(2)} kg
            </div>
          )}
          {order.shipping.totalVolume > 0 && (
            <div className="text-xs text-gray-600 ml-auto">
              Volume total: {order.shipping.totalVolume.toFixed(4)} m³
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span className="text-emerald-600">{formatCurrency(order.total, order.currency)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold"
        >
          <Home className="h-4 w-4" />
          Retour à l'accueil
        </Link>
        <a
          href={`/api/order/${order.orderId}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded font-semibold"
        >
          <FileText className="h-4 w-4" />
          Télécharger la facture
        </a>
      </div>

      {/* Note */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p>
          <strong>Prochaines étapes:</strong> Vous recevrez bientôt un email de confirmation avec
          les détails de votre commande et les informations de suivi. Si vous avez des questions,
          veuillez nous contacter.
        </p>
      </div>
    </div>
  )
}
