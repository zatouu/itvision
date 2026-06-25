import { MapPin } from 'lucide-react'

interface AddressPreviewProps {
  address: {
    fullName?: string
    phone?: string
    region?: string
    department?: string
    quartier?: string
    street?: string
    extra?: string
  }
}

export default function AddressPreview({ address }: AddressPreviewProps) {
  if (!address.region && !address.street) return null

  return (
    <div className="bg-ddm-emerald-light/50 border border-ddm-emerald/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-ddm-emerald" />
        <span className="text-sm font-bold text-ddm-navy">Votre adresse de livraison</span>
      </div>
      <p className="text-sm text-slate-700">
        {address.street}{address.quartier ? `, ${address.quartier}` : ''}
        {address.department ? `, ${address.department}` : ''}
        {address.region ? `, ${address.region}, Sénégal` : ''}
      </p>
      {address.phone && <p className="text-xs text-slate-500 mt-1">Téléphone: {address.phone}</p>}
      {address.fullName && <p className="text-xs text-slate-500">{address.fullName}</p>}
      {address.extra && <p className="text-xs text-slate-500 mt-1 italic">{address.extra}</p>}
    </div>
  )
}
