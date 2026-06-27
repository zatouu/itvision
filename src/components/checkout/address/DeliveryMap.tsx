'use client'

import { useEffect, useState, useCallback } from 'react'
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

export interface GeoAddress {
  display: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  country?: string
  road?: string
  houseNumber?: string
}

interface DeliveryMapProps {
  coordinates?: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
  onAddressChange?: (address: GeoAddress) => void
  region?: string
  department?: string
}

const DEFAULT_CENTER: [number, number] = [14.7167, -17.4677]

async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=fr`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'ITVisionPlus-Checkout/1.0' }
    })
    if (!r.ok) return null
    const data = await r.json()
    const addr = data.address || {}
    return {
      display: data.display_name || '',
      neighbourhood: addr.neighbourhood || addr.hamlet || '',
      suburb: addr.suburb || addr.quarter || addr.city_district || '',
      city: addr.city || '',
      town: addr.town || '',
      village: addr.village || '',
      county: addr.county || '',
      state: addr.state || '',
      country: addr.country || '',
      road: addr.road || addr.pedestrian || addr.street || '',
      houseNumber: addr.house_number || '',
    }
  } catch {
    return null
  }
}

function LocationMarker({
  position,
  onChange,
  onAddressChange,
}: {
  position: [number, number]
  onChange: (coords: { lat: number; lng: number }) => void
  onAddressChange?: (address: GeoAddress) => void
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      handlePositionChange(lat, lng)
      map.setView([lat, lng], map.getZoom())
    },
  })

  useEffect(() => {
    map.setView(position, map.getZoom() || 14)
  }, [position, map])

  const handlePositionChange = useCallback(async (lat: number, lng: number) => {
    onChange({ lat, lng })
    const address = await reverseGeocode(lat, lng)
    if (address) {
      onAddressChange?.(address)
    }
  }, [onChange, onAddressChange])

  return (
    <Marker
      position={position}
      icon={customIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          handlePositionChange(lat, lng)
        },
      }}
    />
  )
}

export default function DeliveryMap({ coordinates, onChange, onAddressChange }: DeliveryMapProps) {
  const [mounted, setMounted] = useState(false)
  const [address, setAddress] = useState<GeoAddress | null>(null)
  const position: [number, number] = coordinates ? [coordinates.lat, coordinates.lng] : DEFAULT_CENTER

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          onChange(coords)
          const addr = await reverseGeocode(coords.lat, coords.lng)
          if (addr) {
            setAddress(addr)
            onAddressChange?.(addr)
          }
        },
        (err) => {
          if (err?.code === 1) {
            alert('Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.')
          } else {
            alert('Impossible de récupérer votre position. Vérifiez que le GPS est activé et que le site est en HTTPS.')
          }
        }
      )
    }
  }

  useEffect(() => {
    if (coordinates) {
      reverseGeocode(coordinates.lat, coordinates.lng).then((addr) => {
        if (addr) {
          setAddress(addr)
          onAddressChange?.(addr)
        }
      })
    }
  }, [coordinates?.lat, coordinates?.lng])

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
        <LocationMarker
          position={position}
          onChange={onChange}
          onAddressChange={(addr) => {
            setAddress(addr)
            onAddressChange?.(addr)
          }}
        />
      </MapContainer>
      <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 flex items-center gap-1 pointer-events-auto shadow-sm">
          <MapPin className="w-3 h-3 text-red-500" />
          {address ? address.display.slice(0, 55) + (address.display.length > 55 ? '…' : '') : 'Cliquez ou glissez le marqueur'}
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
