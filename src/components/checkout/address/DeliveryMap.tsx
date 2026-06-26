'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { MapPin, Crosshair } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const customIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="#FFFFFF"/></svg>`,
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -34],
})

interface DeliveryMapProps {
  coordinates?: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
  region?: string
  department?: string
}

const DEFAULT_CENTER: [number, number] = [14.7167, -17.4677]

function LocationMarker({
  position,
  onChange,
}: {
  position: [number, number]
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      onChange({ lat, lng })
      map.setView([lat, lng], map.getZoom())
    },
  })

  useEffect(() => {
    map.setView(position, map.getZoom() || 14)
  }, [position, map])

  return <Marker position={position} icon={customIcon} draggable eventHandlers={{ dragend: (e) => onChange({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) }} />
}

export default function DeliveryMap({ coordinates, onChange }: DeliveryMapProps) {
  const [mounted, setMounted] = useState(false)
  const position: [number, number] = coordinates ? [coordinates.lat, coordinates.lng] : DEFAULT_CENTER

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

  if (!mounted) {
    return (
      <div className="relative h-full min-h-[260px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
        <span className="text-sm text-slate-500">Chargement de la carte…</span>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[260px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        className="absolute inset-0 z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
      <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 flex items-center gap-1 pointer-events-auto shadow-sm">
          <MapPin className="w-3 h-3 text-red-500" />
          Cliquez ou glissez le marqueur
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          className="pointer-events-auto bg-ddm-navy text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-slate-800 transition shadow-sm"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Géolocaliser
        </button>
      </div>
    </div>
  )
}
