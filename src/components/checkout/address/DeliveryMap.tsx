'use client'

import { useEffect, useState } from 'react'
import { MapPin, Crosshair } from 'lucide-react'

interface DeliveryMapProps {
  coordinates?: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
  region?: string
  department?: string
}

export default function DeliveryMap({ coordinates, onChange }: DeliveryMapProps) {
  const [lat, lng] = [coordinates?.lat ?? 14.7167, coordinates?.lng ?? -17.4677]
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          onChange(coords)
        },
        () => {
          alert('Impossible de récupérer votre position.')
        }
      )
    }
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05}%2C${lat - 0.05}%2C${lng + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <div className="relative h-full min-h-[260px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
      {mounted && (
        <iframe
          src={mapUrl}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          title="Carte de livraison"
        />
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 flex items-center gap-1 pointer-events-auto">
          <MapPin className="w-3 h-3 text-red-500" />
          Cliquer sur la carte pour ajuster
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          className="pointer-events-auto bg-ddm-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-slate-800 transition"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Géolocaliser
        </button>
      </div>
    </div>
  )
}
