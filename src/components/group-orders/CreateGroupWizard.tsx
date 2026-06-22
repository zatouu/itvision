'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search, Tag, Box, CheckCircle, ChevronRight, ChevronLeft,
  Truck, CalendarDays, User, Phone, Mail, Eye, Package, Zap, Factory, ArrowLeft, Users
} from 'lucide-react'

interface CatalogProduct {
  id: string
  name: string
  category?: string
  image?: string
  price?: number
  baseCost?: number
  groupBuyEnabled?: boolean
  groupBuyMinQty?: number
  groupBuyTargetQty?: number
  groupBuyBestPrice?: number
  groupBuyDiscount?: number
  priceTiers?: Array<{ minQty: number; price: number; discount?: number }>
  description?: string
  tagline?: string
  stockStatus?: string
  isImported?: boolean
}

const fmt = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`
const CATS = ['Tous','Tech','Mode','Maison','Beauté','Auto','Brico','Sport','Alimentation']
const SHIPPING_OPTS = [
  { key:'maritime_60j', label:'Maritime', delay:'~60 j', icon:Factory },
  { key:'air_15j', label:'Aérien', delay:'~15 j', icon:Package },
  { key:'express_3j', label:'Express', delay:'~3 j', icon:Zap }
] as const

export default function CreateGroupWizard({ preselectedId }: { preselectedId?: string | null }) {
  const router = useRouter()
  const [step, setStep] = useState(preselectedId ? 2 : 1)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [prodLoading, setProdLoading] = useState(true)
  const [prodSearch, setProdSearch] = useState('')
  const [prodCat, setProdCat] = useState('Tous')
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    productId: '', productName: '', productCategory: 'Tech', productImage: '', productDescription: '',
    productBasePrice: 50000, targetQty: 30, initialQty: 1, currentUnitPrice: 30000,
    priceTiers: [] as Array<{ minQty: number; price: number; discount: number }>,
    deadline: '', shippingMethod: 'maritime_60j' as 'maritime_60j'|'air_15j'|'express_3j',
    creatorName: '', creatorPhone: '', creatorEmail: '',
  })

  /* ─── Autocomplete on product name (step 2) ─── */
  const [nameSuggestions, setNameSuggestions] = useState<CatalogProduct[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const nameInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!form.productName.trim() || form.productName.trim().length < 2) {
      setNameSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      setSuggestLoading(true)
      try {
        const res = await fetch(`/api/catalog/products?limit=20&q=${encodeURIComponent(form.productName.trim())}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.products)) {
          setNameSuggestions(data.products)
          setShowSuggestions(true)
        }
      } catch { /* silent */ }
      finally { setSuggestLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.productName])

  function applyProduct(p: CatalogProduct) {
    setSelectedProduct(p)
    const base = p.price ?? p.baseCost ?? 50000
    const best = p.groupBuyBestPrice ?? Math.round(base * 0.7)
    setForm(f => ({
      ...f,
      productId: p.id,
      productName: p.name,
      productCategory: p.category || 'Tech',
      productImage: p.image || '',
      productDescription: p.description || p.tagline || '',
      productBasePrice: base,
      currentUnitPrice: best,
      targetQty: p.groupBuyTargetQty ?? 30,
      priceTiers: (p.priceTiers || []).map(t => ({ minQty: t.minQty, price: t.price, discount: t.discount ?? 0 })),
    }))
    setShowSuggestions(false)
    setNameSuggestions([])
  }

  useEffect(() => {
    let cancelled = false
    async function fetchProducts() {
      try {
        setProdLoading(true)
        const catParam = prodCat !== 'Tous' ? `&category=${encodeURIComponent(prodCat)}` : ''
        const qParam = prodSearch.trim() ? `&q=${encodeURIComponent(prodSearch.trim())}` : ''
        const res = await fetch(`/api/catalog/products?limit=100${catParam}${qParam}`)
        const data = await res.json()
        if (!cancelled && data.success && Array.isArray(data.products)) {
          setProducts(data.products)
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setProdLoading(false) }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [prodSearch, prodCat])

  useEffect(() => {
    if (!preselectedId || products.length === 0) return
    const p = products.find(x => x.id === preselectedId)
    if (p) selectProduct(p)
  }, [preselectedId, products])

  function selectProduct(p: CatalogProduct) {
    if (!p.groupBuyEnabled) {
      alert('Ce produit n\'est pas disponible en achat groupé. Sélectionnez un produit avec le badge « Groupé ».')
      return
    }
    applyProduct(p)
    setStep(2)
  }

  function getDays(d: string) {
    const diff = new Date(d).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const filteredProducts = useMemo(() => {
    let res = [...products]
    if (prodSearch.trim()) {
      const q = prodSearch.toLowerCase()
      res = res.filter(p => p.name.toLowerCase().includes(q))
    }
    return res
  }, [products, prodSearch])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productId || !selectedProduct) {
      alert('Veuillez sélectionner un produit du catalogue avant de créer un groupe.')
      setStep(1)
      return
    }
    if (!form.creatorName.trim() || !form.creatorPhone.trim()) {
      alert('Veuillez remplir votre nom et votre téléphone.')
      return
    }
    if (!Number.isFinite(form.initialQty) || form.initialQty < 1) {
      alert('Veuillez saisir une quantité initiale valide.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/group-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: form.productId,
          qty: form.initialQty,
          deadline: form.deadline || undefined,
          shippingMethod: form.shippingMethod,
          description: form.productDescription || undefined,
          creator: { name: form.creatorName, phone: form.creatorPhone, email: form.creatorEmail || undefined }
        })
      })
      const data = await res.json()
      if (data.success && data.group?.groupId) {
        router.push(`/achats-groupes/${data.group.groupId}`)
      } else if (data.code === 'GROUP_ALREADY_EXISTS' && data.group?.groupId) {
        const shouldOpen = window.confirm(`${data.error}\n\nVoulez-vous rejoindre le groupe existant ?`)
        if (shouldOpen) router.push(`/achats-groupes/${data.group.groupId}`)
      } else {
        alert(data.error || 'Erreur lors de la création')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setCreating(false)
    }
  }

  const estimatedUnitPrice = useMemo(() => {
    const qty = Number.isFinite(form.initialQty) ? form.initialQty : 0
    const tiers = [...form.priceTiers].sort((a, b) => b.minQty - a.minQty)
    const matched = tiers.find(t => qty >= t.minQty)
    const price = matched?.price ?? form.productBasePrice
    return Math.min(price, form.productBasePrice)
  }, [form.initialQty, form.priceTiers, form.productBasePrice])

  const savingsPct = form.productBasePrice > 0
    ? Math.max(0, Math.round(((form.productBasePrice - estimatedUnitPrice) / form.productBasePrice) * 100))
    : 0

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="bg-[#1A1A2E] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button onClick={() => router.push('/achats-groupes')} className="p-2 hover:bg-white/10 rounded-xl transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Créer un achat groupé</h1>
            <p className="text-xs text-white/60 mt-0.5">Étape {step} sur 3 · {['Choisir un produit','Configurer le groupe','Contact & Validation'][step-1]}</p>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-[#00C853] to-[#7C4DFF]" initial={{width:0}} animate={{width:`${(step/3)*100}%`}} transition={{duration:0.4}} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleCreate}>
          <AnimatePresence mode="wait">

            {step === 1 && (
              <motion.div key="s1" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-[#1A1A2E] mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-[#7C4DFF]"/> Rechercher dans le catalogue</h2>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="Nom du produit..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {CATS.map(c => (
                      <button key={c} type="button" onClick={()=>setProdCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${prodCat===c?'bg-[#1A1A2E] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
                    ))}
                  </div>

                  {prodLoading ? (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-50 rounded-xl h-48 animate-pulse" />)}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      Aucun produit trouvé.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredProducts.map(p => {
                        const eligible = p.groupBuyEnabled
                        return (
                          <button key={p.id} type="button" onClick={()=>selectProduct(p)} className={`text-left border rounded-xl overflow-hidden transition group ${eligible ? 'bg-white border-gray-100 shadow-sm hover:shadow-md' : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'}`}>
                            <div className="relative h-36 bg-gray-100">
                              {p.image ? <Image src={p.image} alt={p.name} fill className={`object-cover transition duration-500 ${eligible ? 'group-hover:scale-105' : ''}`} /> : <Package className="w-8 h-8 text-gray-300 absolute inset-0 m-auto"/>}
                              {p.isImported && <span className="absolute top-2 left-2 bg-[#1A1A2E]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Import</span>}
                              {eligible ? (
                                <span className="absolute top-2 right-2 bg-[#00C853] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Groupé</span>
                              ) : (
                                <span className="absolute top-2 right-2 bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Non groupé</span>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className={`font-bold text-sm line-clamp-2 ${eligible ? 'text-[#1A1A2E]' : 'text-gray-500'}`}>{p.name}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{p.category || 'Sans catégorie'}</span>
                                {p.stockStatus && <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.stockStatus==='in_stock'?'bg-emerald-50 text-[#00C853]':'bg-orange-50 text-[#FFAB40]'}`}>{p.stockStatus==='in_stock'?'En stock':'Sur commande'}</span>}
                              </div>
                              <div className="flex items-baseline justify-between mt-2">
                                <span className={`text-sm font-bold ${eligible ? 'text-[#00C853]' : 'text-gray-400'}`}>{fmt(p.price ?? p.baseCost ?? 0)}</span>
                                {p.groupBuyDiscount ? <span className="text-[10px] font-bold bg-red-50 text-[#FF5252] px-1.5 py-0.5 rounded">-{p.groupBuyDiscount}%</span> : null}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="text-center text-xs text-gray-500">
                  Tous les produits du catalogue sont affichés. Seuls ceux avec le badge <span className="inline-block bg-[#00C853] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Groupé</span> peuvent être utilisés pour un achat groupé.
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-6">
                {selectedProduct && (
                  <div className="bg-gradient-to-r from-[#00C853]/10 to-[#7C4DFF]/10 rounded-xl p-4 flex items-center gap-4 border border-[#00C853]/20">
                    <div className="w-16 h-16 bg-white rounded-lg overflow-hidden relative shrink-0 shadow-sm">
                      {selectedProduct.image ? <Image src={selectedProduct.image} alt="" fill className="object-cover"/> : <Package className="w-6 h-6 text-gray-300 absolute inset-0 m-auto"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#1A1A2E] truncate">{selectedProduct.name}</h3>
                        <span className="text-[10px] bg-[#00C853] text-white px-2 py-0.5 rounded-full font-semibold">Catalogue</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{selectedProduct.category} · {fmt(selectedProduct.price ?? selectedProduct.baseCost ?? 0)}</p>
                    </div>
                    <button type="button" onClick={()=>setStep(1)} className="text-xs font-semibold text-[#7C4DFF] hover:underline shrink-0">Changer</button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-[#1A1A2E] flex items-center gap-2"><Tag className="w-4 h-4 text-[#7C4DFF]"/> Produit</h3>
                    <div ref={nameInputRef} className="relative">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nom <span className="text-gray-400 font-normal">— tapez pour chercher dans le catalogue</span></label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          value={form.productName}
                          onChange={e=>{setSelectedProduct(null); setForm(f=>({...f,productId:'',productName:e.target.value})); setShowSuggestions(true)}}
                          onFocus={()=>{ if (nameSuggestions.length>0) setShowSuggestions(true) }}
                          onBlur={()=>setTimeout(()=>setShowSuggestions(false), 150)}
                          placeholder="Ex: Smartwatch Pro Sport GPS"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]"
                        />
                        {suggestLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-200 border-t-[#7C4DFF] rounded-full animate-spin" />}
                      </div>
                      {showSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {nameSuggestions.map(p => {
                            const eligible = p.groupBuyEnabled
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => eligible ? applyProduct(p) : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${eligible ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
                              >
                                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
                                  {p.image ? <Image src={p.image} alt="" fill className="object-cover"/> : <Package className="w-5 h-5 text-gray-300 absolute inset-0 m-auto"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold truncate ${eligible ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>{p.name}</div>
                                  <div className="text-[10px] text-gray-500">{p.category || 'Sans catégorie'} · {fmt(p.price ?? p.baseCost ?? 0)}</div>
                                </div>
                                {eligible ? (
                                  <span className="text-[10px] bg-[#00C853]/10 text-[#00C853] px-1.5 py-0.5 rounded font-semibold">Groupé</span>
                                ) : (
                                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-semibold">Non groupé</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie</label>
                        <input readOnly value={form.productCategory} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Produit catalogue</label>
                        <input readOnly value={form.productId ? 'Sélectionné' : 'Non sélectionné'} className={`w-full px-4 py-2.5 border rounded-xl bg-gray-50 ${form.productId ? 'border-[#00C853]/30 text-[#00C853]' : 'border-red-100 text-red-500'}`} />
                      </div>
                    </div>
                    {form.productImage && (
                      <div className="relative h-32 rounded-xl overflow-hidden border border-gray-200">
                        <Image src={form.productImage} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                      <textarea value={form.productDescription} onChange={e=>setForm(f=>({...f,productDescription:e.target.value}))} rows={3} placeholder="Optionnel: précision visible sur le groupe" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] resize-none" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-[#1A1A2E] flex items-center gap-2"><Box className="w-4 h-4 text-[#00C853]"/> Quantité & Prix</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Votre quantité</label>
                        <input type="number" min={1} required value={form.initialQty} onChange={e=>setForm(f=>({...f,initialQty:Math.max(1, Math.round(Number(e.target.value) || 1))}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00C853]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Qté cible</label>
                        <input readOnly value={form.targetQty} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Prix estimé</label>
                        <input readOnly value={fmt(estimatedUnitPrice)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-[#00C853] font-semibold" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-[#00C853]/10 to-[#7C4DFF]/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-700">Prix et paliers issus du catalogue</span>
                      <span className="font-bold text-[#00C853]">{fmt(form.productBasePrice - estimatedUnitPrice)} (-{savingsPct}%)</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Paliers de prix catalogue</span>
                        <span className="text-[10px] text-gray-400">Non modifiable ici</span>
                      </div>
                      <div className="space-y-2">
                        {form.priceTiers.map((tier,i)=> (
                          <div key={i} className="grid grid-cols-4 gap-2 items-center bg-gray-50 rounded-xl p-3">
                            <div>
                              <span className="text-[10px] text-gray-500">Min</span>
                              <input readOnly value={tier.minQty} className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white text-gray-600" />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500">Prix</span>
                              <input readOnly value={tier.price} className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white text-gray-600" />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500">Remise %</span>
                              <input readOnly value={tier.discount} className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white text-gray-600" />
                            </div>
                            <CheckCircle className="w-4 h-4 text-[#00C853] justify-self-end" />
                          </div>
                        ))}
                        {form.priceTiers.length===0 && <p className="text-[11px] text-gray-400">Aucun palier. Ajoutez des paliers pour inciter les acheteurs.</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-[#1A1A2E] mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-[#FFAB40]"/> Livraison & Deadline</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Date limite</label>
                      <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFAB40]" />
                      {form.deadline && <p className="text-xs text-gray-500 mt-1">{getDays(form.deadline)} jours restants</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Mode de transport</label>
                      <div className="grid grid-cols-3 gap-3">
                        {SHIPPING_OPTS.map(opt => {
                          const active = form.shippingMethod === opt.key
                          const Icon = opt.icon
                          return (
                            <button key={opt.key} type="button" onClick={()=>setForm(f=>({...f,shippingMethod:opt.key}))} className={`relative p-3 rounded-xl border-2 text-left transition ${active?'border-[#FFAB40] bg-[#FFAB40]/5':'border-gray-200 hover:border-gray-300'}`}>
                              <Icon className={`w-5 h-5 mb-1 ${active?'text-[#FFAB40]':'text-gray-400'}`} />
                              <div className={`text-xs font-bold ${active?'text-[#1A1A2E]':'text-gray-700'}`}>{opt.label}</div>
                              <div className="text-[10px] text-gray-500">{opt.delay}</div>
                              {active && <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#FFAB40] flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={()=>setStep(3)} className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A2E] text-white rounded-xl font-semibold text-sm hover:bg-[#2A2A4E] transition">
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-[#1A1A2E] mb-4 flex items-center gap-2"><User className="w-4 h-4 text-[#7C4DFF]"/> Vos coordonnées</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nom complet <span className="text-red-500">*</span></label>
                      <input required value={form.creatorName} onChange={e=>setForm(f=>({...f,creatorName:e.target.value}))} placeholder="Prénom Nom" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone <span className="text-red-500">*</span></label>
                      <input required value={form.creatorPhone} onChange={e=>setForm(f=>({...f,creatorPhone:e.target.value}))} placeholder="77 000 00 00" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                      <input type="email" value={form.creatorEmail} onChange={e=>setForm(f=>({...f,creatorEmail:e.target.value}))} placeholder="opt@ionnel" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-[#1A1A2E] to-[#7C4DFF] text-white p-3 flex items-center gap-2 text-xs font-bold">
                    <Eye className="w-4 h-4"/> Aperçu de votre groupe
                  </div>
                  <div className="p-5 flex gap-5">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl shrink-0 overflow-hidden relative">
                      {form.productImage ? <Image src={form.productImage} alt="" fill className="object-cover"/> : <Package className="w-10 h-10 text-gray-300 absolute inset-0 m-auto"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg text-[#1A1A2E] truncate">{form.productName || 'Nom du produit'}</h4>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-semibold text-gray-600">{form.productCategory}</span>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.productDescription}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> 0/{form.targetQty}</span>
                        <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5"/> {form.shippingMethod==='maritime_60j'?'Maritime':form.shippingMethod==='air_15j'?'Aérien':'Express'}</span>
                        {form.deadline && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5"/> {getDays(form.deadline)}j</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-gray-400 line-through">{fmt(form.productBasePrice)}</div>
                      <div className="text-xl font-bold text-[#00C853]">{fmt(estimatedUnitPrice)}</div>
                      <div className="text-xs font-bold text-[#FF5252]">-{savingsPct}%</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={()=>setStep(2)} className="flex items-center gap-2 px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold text-sm transition">
                    <ChevronLeft className="w-4 h-4"/> Précédent
                  </button>
                  <button type="submit" disabled={creating} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00C853] to-[#7C4DFF] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
                    {creating ? 'Création...' : <>Créer le groupe <CheckCircle className="w-4 h-4"/></>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  )
}
