'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  User, Phone, Mail, MapPin, Lock, ShieldCheck, FileCheck, Headphones,
  ChevronLeft, Truck, Zap, Package, Ship, Calendar, HelpCircle
} from 'lucide-react'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'
import CheckoutStepper from '@/components/cart/CheckoutStepper'
import AuthOptionsBanner from '@/components/checkout/address/AuthOptionsBanner'
import SavedAddressCard from '@/components/checkout/address/SavedAddressCard'
import FormField from '@/components/checkout/address/FormField'
import SelectField from '@/components/checkout/address/SelectField'
import TextareaField from '@/components/checkout/address/TextareaField'
import AddressPreview from '@/components/checkout/address/AddressPreview'
import DeliveryOptionCard from '@/components/checkout/address/DeliveryOptionCard'
import { SENEGAL_REGIONS, getDepartments, getQuartiers } from '@/lib/data/senegal-locations'
import dynamic from 'next/dynamic'
import type { GeoAddress } from '@/components/checkout/address/DeliveryMap'

const DeliveryMap = dynamic(() => import('@/components/checkout/address/DeliveryMap'), { ssr: false })

const formatCurrency = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-'

const deliveryOptions = [
  { id: 'standard', label: 'Standard', duration: 'Livraison à domicile 3-5 jours', price: 'Gratuit', icon: Truck, recommended: true },
  { id: 'pickup', label: 'Point relais', duration: 'Retirer au point relais 1-2 jours', price: '+1 500 FCFA', icon: Package },
  { id: 'express', label: 'Express priorité', duration: 'Livraison express 24h-48h', price: '+5 000 FCFA', icon: Zap },
  { id: 'sea', label: 'Maritime économique', duration: 'Maritime groupé 45-60 jours', price: 'Meilleur prix', icon: Ship },
]

export default function AddressPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [authMode, setAuthMode] = useState<'guest' | 'login' | 'register'>('guest')
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    region: '',
    department: '',
    quartier: '',
    street: '',
    extra: '',
    coordinates: null as { lat: number; lng: number } | null,
  })
  const [selectedDelivery, setSelectedDelivery] = useState('standard')
  const [saveAddress, setSaveAddress] = useState(true)
  const [differentBilling, setDifferentBilling] = useState(false)
  const [whatsappNotif, setWhatsappNotif] = useState(true)
  const [giftWrap, setGiftWrap] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('checkout_cart')
    if (raw) {
      try {
        const checkout = JSON.parse(raw)
        setItems(checkout.items || [])
      } catch {
        setItems([])
      }
    } else {
      const rawCart = localStorage.getItem('cart:items')
      setItems(rawCart ? JSON.parse(rawCart) : [])
    }
  }, [])

  useEffect(() => {
    fetch('/api/client/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile) {
          setForm(prev => ({
            ...prev,
            fullName: prev.fullName || data.profile.name || '',
            phone: prev.phone || data.profile.phone || '',
            email: prev.email || data.profile.email || '',
          }))
          if (data.lastAddress) {
            setSavedAddresses([{ _id: 'last', type: 'home', label: 'Maison', ...data.lastAddress }])
          }
        }
      })
      .catch(() => {})
  }, [])

  const departments = useMemo(() => getDepartments(form.region), [form.region])
  const quartiers = useMemo(() => getQuartiers(form.department), [form.department])

  const handleRegionChange = (region: string) => {
    setForm(prev => ({ ...prev, region, department: '', quartier: '' }))
  }

  const handleDepartmentChange = (department: string) => {
    setForm(prev => ({ ...prev, department, quartier: '' }))
  }

  const normalizeRegion = (name: string) => name.toLowerCase().replace(/\b(region|región|département|department|arrondissement)\b/g, '').trim()

  const handleAddressFromMap = (address: GeoAddress) => {
    // Construire la rue
    const streetParts = [address.houseNumber, address.road].filter(Boolean)
    const street = streetParts.join(' ')

    // Extraire la zone locale
    const localArea = [address.suburb, address.neighbourhood].filter(Boolean).join(', ')

    // Matcher la région (Nominatim retourne parfois "Dakar Region" ou "Thiès")
    const regionName = normalizeRegion(address.state || address.county || '')
    const cityName = normalizeRegion(address.city || address.town || address.village || '')
    const searchRegion = regionName || cityName

    const matchedRegion = SENEGAL_REGIONS.find(r => {
      const rName = r.name.toLowerCase()
      return searchRegion.includes(rName) || rName.includes(searchRegion)
    })?.name || ''

    // Matcher le département
    let matchedDepartment = ''
    if (matchedRegion) {
      const departments = getDepartments(matchedRegion)
      matchedDepartment = departments.find(d => {
        const dName = d.toLowerCase()
        return cityName.includes(dName) || dName.includes(cityName) ||
          (regionName && regionName.includes(dName)) ||
          (address.county && normalizeRegion(address.county).includes(dName))
      }) || ''
    }

    // Matcher le quartier si possible
    let matchedQuartier = ''
    if (matchedDepartment) {
      const quartiers = getQuartiers(matchedDepartment)
      matchedQuartier = quartiers.find(q => {
        const qName = q.toLowerCase()
        return localArea.toLowerCase().includes(qName) || qName.includes(localArea.toLowerCase())
      }) || ''
    }

    setForm(prev => ({
      ...prev,
      street: street || prev.street,
      extra: localArea || prev.extra,
      region: matchedRegion || prev.region,
      department: matchedDepartment || prev.department,
      quartier: matchedQuartier || prev.quartier,
    }))
  }

  const subtotal = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0), [items])
  const transport = 9600
  const serviceFees = 0
  const insurance = 0
  const total = subtotal + serviceFees + transport + insurance + (giftWrap ? 1500 : 0)
  const estimatedDate = '15-17 Novembre 2024'

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.fullName.trim() || form.fullName.length < 2) next.fullName = 'Nom complet requis'
    if (!form.phone.trim() || !/^\+?[\d\s\-]{8,15}$/.test(form.phone.replace(/\s|-/g, ''))) next.phone = 'Numéro de téléphone invalide'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email invalide'
    if (!form.region) next.region = 'Région requise'
    if (!form.department) next.department = 'Département requis'
    if (!form.quartier) next.quartier = 'Quartier requis'
    if (!form.street.trim() || form.street.length < 3) next.street = 'Rue / numéro requis'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleContinue = async () => {
    if (!validate()) return
    if (items.length === 0) {
      alert('Votre panier est vide.')
      return
    }

    setLoading(true)
    try {
      // Vérifier si l'utilisateur est authentifié
      let isAuthenticated = false
      try {
        const profileRes = await fetch('/api/client/profile', { credentials: 'include' })
        isAuthenticated = profileRes.ok
      } catch {
        isAuthenticated = false
      }

      // Si invité, créer un compte tacite avec les infos de livraison
      if (!isAuthenticated) {
        const guestRes = await fetch('/api/auth/guest-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: form.fullName,
            phone: form.phone,
            email: form.email,
          }),
        })
        const guestData = await guestRes.json()
        if (!guestRes.ok || !guestData.success) {
          throw new Error(guestData.error || 'Impossible de créer le compte invité')
        }
      }

      const deliveryMethodMap: Record<string, string> = {
        standard: 'air_15j',
        pickup: 'air_15j',
        express: 'express_3j',
        sea: 'maritime_60j',
      }

      const payload = {
        cart: items.map((it: any) => ({ id: it.id, qty: it.qty || 1, name: it.name, variantIds: it.variantIds, variantId: it.variantId, variantLabels: it.variantLabels })),
        name: form.fullName,
        phone: form.phone,
        email: form.email,
        address: {
          region: form.region,
          department: form.department,
          neighborhood: form.quartier,
          street: form.street,
          additionalInfo: form.extra,
          country: 'Sénégal',
        },
        shippingMethod: deliveryMethodMap[selectedDelivery] || 'air_15j',
      }

      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la commande')
      }
      sessionStorage.setItem('checkout_address', JSON.stringify({
        ...form,
        deliveryMethod: selectedDelivery,
        saveAddress,
        whatsappNotif,
        giftWrap,
      }))
      router.push(`/paiement/checkout/${data.orderId}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MarketHeader />
      <div className="pt-16">
        <CheckoutStepper currentStep="address" />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-32">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/panier" className="hover:text-ddm-emerald">Panier</Link>
          <span>/</span>
          <span className="text-ddm-emerald font-medium">Adresse</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-ddm-emerald" />
          Adresse de livraison
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <AuthOptionsBanner mode={authMode} onSetMode={setAuthMode} />

            {savedAddresses.length > 0 && (
              <section>
                <h3 className="font-bold text-slate-900 mb-3">📍 Mes adresses enregistrées</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {savedAddresses.map(addr => (
                    <SavedAddressCard
                      key={addr._id}
                      address={addr}
                      selected={selectedAddressId === addr._id}
                      onSelect={() => {
                        setSelectedAddressId(addr._id)
                        setForm(prev => ({ ...prev, ...addr }))
                      }}
                    />
                  ))}
                  <button
                    onClick={() => setSelectedAddressId('new')}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-ddm-emerald text-sm font-medium text-slate-600 flex items-center justify-center"
                  >
                    + Ajouter une adresse
                  </button>
                </div>
              </section>
            )}

            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-5"
              onSubmit={e => e.preventDefault()}
            >
              <h3 className="font-bold text-slate-900">📝 Détails de livraison</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  icon={User}
                  label="Nom complet *"
                  value={form.fullName}
                  onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  error={errors.fullName}
                />
                <FormField
                  icon={Phone}
                  label="Téléphone *"
                  prefix="+221"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  error={errors.phone}
                />
              </div>
              <FormField
                icon={Mail}
                label="Email (optionnel)"
                hint="Pour recevoir le lien de suivi"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                error={errors.email}
              />

              <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
                <div className="space-y-4">
                  <SelectField
                    label="Région *"
                    options={SENEGAL_REGIONS.map(r => r.name)}
                    value={form.region}
                    onChange={handleRegionChange}
                    error={errors.region}
                  />
                  <SelectField
                    label="Département *"
                    options={departments}
                    value={form.department}
                    onChange={handleDepartmentChange}
                    disabled={!form.region}
                    error={errors.department}
                  />
                  <SelectField
                    label="Quartier *"
                    options={quartiers}
                    value={form.quartier}
                    onChange={v => setForm(prev => ({ ...prev, quartier: v }))}
                    disabled={!form.department}
                    error={errors.quartier}
                  />
                  <FormField
                    label="Rue / Numéro *"
                    value={form.street}
                    onChange={e => setForm(prev => ({ ...prev, street: e.target.value }))}
                    error={errors.street}
                  />
                  <TextareaField
                    label="Informations supplémentaires"
                    placeholder="Ex: Près du marché, immeuble jaune..."
                    value={form.extra}
                    onChange={e => setForm(prev => ({ ...prev, extra: e.target.value }))}
                    rows={3}
                  />
                </div>
                <DeliveryMap
                  coordinates={form.coordinates}
                  onChange={coords => setForm(prev => ({ ...prev, coordinates: coords }))}
                  onAddressChange={handleAddressFromMap}
                  region={form.region}
                  department={form.department}
                />
              </div>

              <AddressPreview address={form} />
            </motion.form>

            <section>
              <h3 className="font-bold text-slate-900 mb-3">🚚 Choisissez votre option</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {deliveryOptions.map(opt => (
                  <DeliveryOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    duration={opt.duration}
                    price={opt.price}
                    icon={opt.icon}
                    selected={selectedDelivery === opt.id}
                    recommended={opt.recommended}
                    onSelect={() => setSelectedDelivery(opt.id)}
                  />
                ))}
              </div>
            </section>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="accent-ddm-emerald" />
                Enregistrer cette adresse dans mon compte
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={differentBilling} onChange={e => setDifferentBilling(e.target.checked)} className="accent-ddm-emerald" />
                Adresse de facturation différente
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={whatsappNotif} onChange={e => setWhatsappNotif(e.target.checked)} className="accent-ddm-emerald" />
                Recevoir des notifications WhatsApp sur la livraison
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={giftWrap} onChange={e => setGiftWrap(e.target.checked)} className="accent-ddm-emerald" />
                Emballage cadeau (+1 500 FCFA)
              </label>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/panier" className="px-5 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-400 flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Retour au panier
              </Link>
              <motion.button
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleContinue}
                disabled={loading}
                className="px-8 h-14 bg-ddm-emerald hover:bg-ddm-emerald-dark disabled:opacity-60 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                {loading ? 'Création de la commande…' : <>Vérifier la commande <ChevronLeft className="w-4 h-4 rotate-180" /></>}
              </motion.button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-ddm-emerald" />
                Récapitulatif ({items.length} article{items.length > 1 ? 's' : ''})
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {items.map((it, idx) => (
                  <div key={idx} className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                    {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200" />}
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transport estimé</span>
                  <span className="font-medium">+ {formatCurrency(transport)}</span>
                </div>
                {giftWrap && (
                  <div className="flex justify-between text-slate-600">
                    <span>Emballage cadeau</span>
                    <span className="font-medium">+ 1 500 FCFA</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total estimé</span>
                  <span className="text-lg font-bold text-ddm-emerald">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-4 h-4 text-ddm-emerald" />
                <div>
                  <p className="font-medium">Estimation livraison</p>
                  <p>Délai: 3-5 jours ouvrés · Date estimée: <strong>{estimatedDate}</strong></p>
                </div>
              </div>
            </div>

            <div className="bg-ddm-emerald-light/40 border border-ddm-emerald/20 rounded-xl p-4">
              <p className="text-sm font-bold text-ddm-navy mb-2">Vos données sont protégées</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-ddm-emerald" /> Chiffrement SSL</div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-ddm-emerald" /> Aucune carte stockée</div>
                <div className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-ddm-emerald" /> Conformité RGPD</div>
                <div className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5 text-ddm-emerald" /> Support 7j/7</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-ddm-emerald" /> Besoin d'aide ?
              </p>
              <p className="text-xs text-slate-600">Appelez le support 33 800 00 00 ou chattez sur WhatsApp.</p>
            </div>
          </aside>
        </div>
      </main>

      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
