import { MapPin, Home, Briefcase } from 'lucide-react'

interface SavedAddressCardProps {
  address: any
  selected: boolean
  onSelect: () => void
}

const iconMap: Record<string, typeof Home> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
}

export default function SavedAddressCard({ address, selected, onSelect }: SavedAddressCardProps) {
  const Icon = iconMap[address.type] || MapPin

  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 rounded-xl border-2 transition ${
        selected
          ? 'border-ddm-emerald bg-emerald-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-ddm-emerald text-white' : 'bg-slate-100 text-slate-600'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{address.label || 'Adresse'}</p>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
            {address.street}, {address.quartier}, {address.department}, {address.region}
          </p>
          {selected && (
            <p className="text-xs text-ddm-emerald font-medium mt-1">Par défaut</p>
          )}
        </div>
      </div>
    </button>
  )
}
