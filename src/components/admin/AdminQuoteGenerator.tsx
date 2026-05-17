'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { 
  FileText, Download, Save, Plus, Trash2, Eye, Send, 
  Building, User, Phone, Mail, MapPin, Calendar, Hash,
  Package, DollarSign, Calculator, Edit3, X, Search, CheckCircle,
  Receipt
} from 'lucide-react'
import Image from 'next/image'

interface QuoteProduct {
  id: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  taxable: boolean
  total: number
  isLabor?: boolean
}

interface QuoteClient {
  name: string
  address: string
  phone: string
  email: string
  rcn?: string
  ninea?: string
}

interface Quote {
  id: string
  numero: string
  title?: string
  date: string
  client: QuoteClient
  cci?: string
  companyAddress?: string
  products: QuoteProduct[]
  subtotal: number
  brsAmount: number // 5% de déduction
  taxAmount: number
  other: number
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  notes?: string
  bonCommande?: string
  dateLivraison?: string
  pointExpedition?: string
  conditions?: string
  clientResponse?: 'pending' | 'accepted' | 'rejected' | 'counter_proposed'
  clientRespondedAt?: string
  clientCounterAmount?: number
  clientComments?: Array<{ authorId: string; authorRole: string; message: string; createdAt: string; readByOther: boolean }>
  clientCompanyId?: string
}

interface Product {
  _id: string
  name: string
  price?: number
  b2bPrice?: number | null
  category: string
  inStock: boolean
  image?: string
  availability?: { status: string }
}

export default function AdminQuoteGenerator() {
  const { addToast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [searchProduct, setSearchProduct] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list')
  const [isSaving, setIsSaving] = useState(false)
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [clientQuery, setClientQuery] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const [clientSearching, setClientSearching] = useState(false)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const router = useRouter()

  const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(String(value || ''))

  const normalizeQuote = (q: any): Quote => {
    const id = String(q?._id || q?.id || '')
    return {
      id,
      numero: String(q?.numero || ''),
      title: String(q?.title || ''),
      cci: String(q?.cci || ''),
      companyAddress: String(q?.companyAddress || '11 Cité Lessine, Nord Foire'),
      date: q?.date ? new Date(q.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      client: {
        name: String(q?.client?.name || ''),
        address: String(q?.client?.address || ''),
        phone: String(q?.client?.phone || ''),
        email: String(q?.client?.email || ''),
        rcn: q?.client?.rcn,
        ninea: q?.client?.ninea
      },
      products: Array.isArray(q?.products)
        ? q.products.map((p: any) => ({
            id: String(p?.id || p?._id || `item-${Math.random()}`),
            productId: p?.productId ? String(p.productId) : undefined,
            description: String(p?.description || ''),
            quantity: Number(p?.quantity || 0),
            unitPrice: Number(p?.unitPrice || 0),
            taxable: Boolean(p?.taxable),
            isLabor: Boolean(p?.isLabor),
            total: Number(p?.total || 0)
          }))
        : [],
      subtotal: Number(q?.subtotal || 0),
      brsAmount: Number(q?.brsAmount || 0),
      taxAmount: Number(q?.taxAmount || 0),
      other: Number(q?.other || 0),
      total: Number(q?.total || 0),
      status: (q?.status as Quote['status']) || 'draft',
      notes: q?.notes,
      bonCommande: q?.bonCommande,
      dateLivraison: q?.dateLivraison,
      pointExpedition: q?.pointExpedition,
      conditions: q?.conditions,
      clientResponse: q?.clientResponse,
      clientRespondedAt: q?.clientRespondedAt,
      clientCounterAmount: q?.clientCounterAmount ? Number(q.clientCounterAmount) : undefined,
      clientComments: Array.isArray(q?.clientComments) ? q.clientComments : undefined,
      clientCompanyId: q?.clientCompanyId ? String(q.clientCompanyId) : undefined,
    }
  }

  const searchClients = async (q: string) => {
    if (!q.trim()) { setClientResults([]); setShowClientDrop(false); return }
    setClientSearching(true)
    try {
      const res = await fetch(`/api/admin/clients?q=${encodeURIComponent(q)}&limit=8`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setClientResults(data.clients || [])
        setShowClientDrop(true)
      }
    } catch { setClientResults([]) }
    finally { setClientSearching(false) }
  }

  const selectClient = (c: any) => {
    if (!currentQuote) return
    setCurrentQuote({
      ...currentQuote,
      clientCompanyId: String(c._id || c.id || ''),
      client: {
        name: c.company || c.name || '',
        address: c.address || '',
        phone: c.phone || '',
        email: c.email || '',
        rcn: c.rcn,
        ninea: c.ninea,
      }
    })
    setClientQuery(c.company || c.name || '')
    setShowClientDrop(false)
    setClientResults([])
  }

  useEffect(() => {
    loadProducts()
    loadQuotes()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/catalog/products?limit=200')
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.products || []).map((p: any) => ({
          _id: String(p._id || p.id),
          name: p.name || '',
          price: p.price ?? null,
          b2bPrice: p.b2bPrice ?? null,
          category: p.category || '',
          inStock: p.availability?.status === 'in_stock',
          image: p.image || null,
          availability: p.availability
        }))
        setProducts(mapped)
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error)
    }
  }

  const loadQuotes = async () => {
    try {
      const res = await fetch('/api/admin/quotes')
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data?.quotes) ? data.quotes : []
        setQuotes(list.map((q: any) => normalizeQuote(q)).filter((q: Quote) => q.id))
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error)
      // Fallback localStorage
      const stored = localStorage.getItem('itvision-admin-quotes')
      if (stored) setQuotes(JSON.parse(stored))
    }
  }

  const createNewQuote = () => {
    const newQuote: Quote = {
      id: `TEMP-${Date.now()}`,
      numero: `2026-${String(quotes.length + 1).padStart(3, '0')}`,
      title: '',
      cci: '',
      companyAddress: '11 Cité Lessine, Nord Foire',
      date: new Date().toISOString().split('T')[0],
      client: {
        name: '',
        address: '',
        phone: '',
        email: ''
      },
      products: [],
      subtotal: 0,
      brsAmount: 0,
      taxAmount: 0,
      other: 0,
      total: 0,
      status: 'draft'
    }
    setCurrentQuote(newQuote)
    setClientQuery('')
    setActiveTab('create')
  }

  const addProductToQuote = (product: Product) => {
    if (!currentQuote) return

    const effectivePrice = product.b2bPrice || product.price || 0

    const newProduct: QuoteProduct = {
      id: `item-${Date.now()}`,
      productId: product._id,
      description: product.name,
      quantity: 1,
      unitPrice: effectivePrice,
      taxable: true,
      isLabor: false,
      total: effectivePrice
    }

    const updatedQuote = {
      ...currentQuote,
      products: [...currentQuote.products, newProduct]
    }

    calculateTotals(updatedQuote)
    setShowProductModal(false)
    setSearchProduct('')
  }

  const LABOR_KEYWORDS = [
    'installation', 'main-d\u0153uvre', 'main-d\u2019\u0153uvre', 'main d\u0153uvre', 'main d\u2019\u0153uvre',
    'main-doeuvre', 'main-d\u2019oeuvre', 'main doeuvre', 'main d\u2019oeuvre',
    'pose', 'c\u00e2blage', 'cablage', 'montage', 'configuration', 'mise en place',
    'raccordement', 'maintenance', 'd\u00e9pannage', 'depannage', 'intervention',
    'forfait', 'service', 'prestation', 'heure', 'heures', 'journ\u00e9e', 'jour',
    'technicien', 'ing\u00e9nieur', '\u00e9tude', 'etude', 'visite', 'd\u00e9placement',
    'deplacement', 'd\u00e9montage', 'demontage', 'r\u00e9glage', 'reglage',
    'programmation', 'formation', 'support', 'assistance', 'audit', 'conseil'
  ]

  const detectLabor = (text: string): boolean => {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return LABOR_KEYWORDS.some(k => t.includes(k))
  }

  const addCustomProduct = () => {
    if (!currentQuote) return

    const newProduct: QuoteProduct = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxable: true,
      isLabor: true,
      total: 0
    }

    const updatedQuote = {
      ...currentQuote,
      products: [...currentQuote.products, newProduct]
    }

    setCurrentQuote(updatedQuote)
  }

  const updateProduct = (productId: string, field: keyof QuoteProduct, value: any) => {
    if (!currentQuote) return

    const updatedProducts = currentQuote.products.map(p => {
      if (p.id === productId) {
        const updated = { ...p, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice
        }
        if (field === 'description' && typeof value === 'string') {
          updated.isLabor = detectLabor(value)
        }
        return updated
      }
      return p
    })

    const updatedQuote = {
      ...currentQuote,
      products: updatedProducts
    }

    calculateTotals(updatedQuote)
  }

  const removeProduct = (productId: string) => {
    if (!currentQuote) return

    const updatedQuote = {
      ...currentQuote,
      products: currentQuote.products.filter(p => p.id !== productId)
    }

    calculateTotals(updatedQuote)
  }

  const calculateTotals = (quote: Quote) => {
    // Sous-total
    const subtotal = quote.products.reduce((sum, p) => sum + p.total, 0)

    // BRS (Bordereau de Réduction Sénégalaise) = 5% sur la main-d'œuvre uniquement
    const laborTotal = quote.products.filter(p => p.isLabor).reduce((sum, p) => sum + p.total, 0)
    const brsAmount = laborTotal * 0.05

    // Sous-total après BRS
    const subtotalApresBRS = subtotal - brsAmount

    // Taxe de vente (si applicable) - 0% par défaut, peut être ajustée
    const taxAmount = 0

    // Autres frais
    const other = quote.other || 0

    // Total final
    const total = subtotalApresBRS + taxAmount + other

    setCurrentQuote({
      ...quote,
      subtotal,
      brsAmount,
      taxAmount,
      total
    })
  }

  const updateClientInfo = (field: keyof QuoteClient, value: string) => {
    if (!currentQuote) return

    setCurrentQuote({
      ...currentQuote,
      client: {
        ...currentQuote.client,
        [field]: value
      }
    })
  }

  const persistB2bPrices = async (quote: Quote) => {
    const updates = quote.products
      .filter(p => p.productId && p.unitPrice > 0)
      .map(p => ({ productId: p.productId!, b2bPrice: p.unitPrice }))

    if (updates.length === 0) return

    try {
      await fetch('/api/products/b2b-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates })
      })
    } catch (err) {
      console.error('Erreur sauvegarde prix B2B:', err)
    }
  }

  const saveQuote = async () => {
    if (!currentQuote) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuote)
      })

      if (res.ok) {
        const data = await res.json().catch(() => null)
        const saved = data?.quote ? normalizeQuote(data.quote) : currentQuote

        // Persister les prix B2B modifiés
        await persistB2bPrices(currentQuote)

        // Mettre à jour la liste
        const updatedQuotes = [...quotes]
        const index = updatedQuotes.findIndex(q => q.id === currentQuote.id || q.id === saved.id)
        if (index >= 0) {
          updatedQuotes[index] = saved
        } else {
          updatedQuotes.push(saved)
        }
        setQuotes(updatedQuotes)
        
        // Sauvegarder localement aussi
        localStorage.setItem('itvision-admin-quotes', JSON.stringify(updatedQuotes))
        
        addToast('Devis sauvegardé avec succès', 'success')
        setActiveTab('list')
        setCurrentQuote(null)
      } else {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Erreur de sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      
      // Fallback localStorage
      const updatedQuotes = [...quotes]
      const index = updatedQuotes.findIndex(q => q.id === currentQuote.id)
      if (index >= 0) {
        updatedQuotes[index] = currentQuote
      } else {
        updatedQuotes.push(currentQuote)
      }
      setQuotes(updatedQuotes)
      localStorage.setItem('itvision-admin-quotes', JSON.stringify(updatedQuotes))
      
      addToast('Devis sauvegardé localement (hors ligne)', 'warning')
      setActiveTab('list')
      setCurrentQuote(null)
    } finally {
      setIsSaving(false)
    }
  }

  const exportPDF = async () => {
    if (!currentQuote) return

    try {
      const res = await fetch('/api/admin/quotes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuote)
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Devis-${currentQuote.numero}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      addToast('Erreur lors de la génération du PDF', 'error')
    }
  }

  const editQuote = (quote: Quote) => {
    setCurrentQuote(quote)
    setClientQuery(quote.client?.name || '')
    setActiveTab('create')
  }

  const deleteQuote = (quoteId: string) => {
    if (!confirm('Supprimer ce devis ?')) return

    const updatedQuotes = quotes.filter(q => q.id !== quoteId)
    setQuotes(updatedQuotes)
    localStorage.setItem('itvision-admin-quotes', JSON.stringify(updatedQuotes))

    if (isObjectId(quoteId)) {
      fetch(`/api/admin/quotes?id=${encodeURIComponent(quoteId)}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    }
  }

  const sendQuoteByEmail = async (quote: Quote) => {
    if (!quote?.id || !isObjectId(quote.id)) {
      addToast('Veuillez d\'abord sauvegarder le devis avant envoi', 'warning')
      return
    }
    try {
      setSendingQuoteId(quote.id)
      const res = await fetch('/api/admin/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: quote.id })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Envoi impossible')
      }
      await loadQuotes()
      addToast('Devis envoyé par email', 'success')
    } catch (e: any) {
      addToast(e?.message || 'Erreur lors de l\'envoi du devis', 'error')
    } finally {
      setSendingQuoteId(null)
    }
  }

  const convertToInvoice = async (quote: Quote) => {
    if (!confirm('Voulez-vous convertir ce devis en facture ?')) return
    setConvertingId(quote.id)

    try {
      // 1. Calculer les totaux de facture (sans BRS, structure standard)
      // On reprend les articles tels quels et on ajoute une catégorie par défaut
      const items = quote.products.map(p => ({
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.total,
        category: 'products' 
      }))

      const payload = {
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft',
        quoteId: quote.id,
        client: {
          name: quote.client.name,
          address: quote.client.address,
          email: quote.client.email,
          phone: quote.client.phone,
          taxId: quote.client.ninea
        },
        items,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        notes: `Facture générée depuis le devis ${quote.numero}`
      }

      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        addToast('Facture créée avec succès', 'success')
        router.push('/admin/factures')
      } else {
        const error = await res.json()
        addToast('Erreur lors de la conversion : ' + (error.error || 'Erreur inconnue'), 'error')
      }
    } catch (e) {
      console.error(e)
      addToast('Erreur lors de la conversion en facture', 'error')
    } finally {
      setConvertingId(null)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.category.toLowerCase().includes(searchProduct.toLowerCase())
  )

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon'
      case 'sent': return 'Envoyé'
      case 'accepted': return 'Accepté'
      case 'rejected': return 'Rejeté'
      default: return status
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📋 Génération de Devis</h1>
            <p className="text-blue-100">Créez et gérez vos devis professionnels avec BRS (5%)</p>
          </div>
          <button
            onClick={createNewQuote}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouveau Devis
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-5 w-5" />
              Liste des Devis ({quotes.length})
            </div>
          </button>
          {currentQuote && (
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Edit3 className="h-5 w-5" />
                {currentQuote.numero ? `Éditer ${currentQuote.numero}` : 'Nouveau Devis'}
              </div>
            </button>
          )}
        </div>

        {/* Contenu Liste */}
        {activeTab === 'list' && (
          <div className="p-6">
            {quotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun devis</h3>
                <p className="text-gray-500 mb-6">Commencez par créer votre premier devis</p>
                <button
                  onClick={createNewQuote}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Créer un devis
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Devis #{quote.numero}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                            {getStatusLabel(quote.status)}
                          </span>
                          {quote.clientResponse && quote.clientResponse !== 'pending' && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              quote.clientResponse === 'accepted' ? 'bg-green-100 text-green-700' :
                              quote.clientResponse === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-violet-100 text-violet-700'
                            }`}>
                              Client : {quote.clientResponse === 'accepted' ? '✓ Accepté' : quote.clientResponse === 'rejected' ? '✗ Refusé' : '↔ Contre-proposition'}
                            </span>
                          )}
                          {quote.clientResponse === 'pending' && quote.status === 'sent' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">En attente réponse</span>
                          )}
                          {(quote.clientComments?.length ?? 0) > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              💬 {quote.clientComments!.length} message{(quote.clientComments!.length ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {quote.client.name || 'Client non défini'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(quote.date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {quote.products.length} article{quote.products.length > 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-semibold text-gray-900">
                              {quote.total.toLocaleString('fr-FR')} CFA
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editQuote(quote)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Éditer"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => sendQuoteByEmail(quote)}
                          disabled={sendingQuoteId === quote.id}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-60"
                          title="Envoyer par email"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentQuote(quote)
                            exportPDF()
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => convertToInvoice(quote)}
                          disabled={convertingId === quote.id}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Convertir en facture"
                        >
                           <Receipt className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteQuote(quote.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenu Création/Édition */}
        {activeTab === 'create' && currentQuote && (
          <div className="p-6 space-y-6">
            {/* Informations devis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de devis
                </label>
                <input
                  type="text"
                  value={currentQuote.numero}
                  onChange={(e) => setCurrentQuote({ ...currentQuote, numero: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-046"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={currentQuote.date}
                  onChange={(e) => setCurrentQuote({ ...currentQuote, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={currentQuote.status}
                  onChange={(e) => setCurrentQuote({ ...currentQuote, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyé</option>
                  <option value="accepted">Accepté</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>
            </div>

            {/* Recherche client portail */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
                <Search className="h-4 w-4" />
                Lier un client portail (optionnel)
              </h3>
              <div className="relative">
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => { setClientQuery(e.target.value); searchClients(e.target.value) }}
                  onBlur={() => setTimeout(() => setShowClientDrop(false), 200)}
                  placeholder="Rechercher : TEYLIOMS, Coralia…"
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 bg-white"
                />
                {clientSearching && <span className="absolute right-3 top-2.5 text-xs text-gray-400">…</span>}
                {currentQuote?.clientCompanyId && !showClientDrop && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-700">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                    Lié au portail <span className="font-mono text-[10px] text-gray-400 ml-1">{currentQuote.clientCompanyId.slice(-6)}</span>
                    <button onClick={() => setCurrentQuote({ ...currentQuote, clientCompanyId: undefined })} className="ml-auto text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </div>
                )}
                {showClientDrop && clientResults.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {clientResults.map((c) => (
                      <li key={String(c._id || c.id)}
                        onMouseDown={() => selectClient(c)}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer">
                        <Building className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{c.company || c.name}</div>
                          <div className="text-xs text-gray-400 truncate">{c.email} · {c.phone}</div>
                        </div>
                        {c.isActive && <span className="ml-auto text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Actif</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Informations client */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Devis pour
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du client *
                  </label>
                  <input
                    type="text"
                    value={currentQuote.client.name}
                    onChange={(e) => updateClientInfo('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Coralia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={currentQuote.client.phone}
                    onChange={(e) => updateClientInfo('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+221 77 413 34 40"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={currentQuote.client.address}
                    onChange={(e) => updateClientInfo('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="11 Cité Lessine, Nord Foire"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={currentQuote.client.email}
                    onChange={(e) => updateClientInfo('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@client.sn"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RC N° / SN DDER
                  </label>
                  <input
                    type="text"
                    value={currentQuote.client.rcn || ''}
                    onChange={(e) => updateClientInfo('rcn', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="SN DDER 2019 A 10739"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NINEA
                  </label>
                  <input
                    type="text"
                    value={currentQuote.client.ninea || ''}
                    onChange={(e) => updateClientInfo('ninea', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="007305734"
                  />
                </div>
              </div>
            </div>

            {/* Produits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Articles du devis
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Catalogue
                  </button>
                  <button
                    onClick={addCustomProduct}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Article personnalisé
                  </button>
                </div>
              </div>

              {currentQuote.products.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun article ajouté</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantité</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prix unitaire</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Imposable?</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Main-d'œuvre?</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentQuote.products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateProduct(product.id, 'quantity', Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={product.description}
                              onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="Description de l'article"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={product.unitPrice}
                                onChange={(e) => updateProduct(product.id, 'unitPrice', Number(e.target.value))}
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">CFA</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={product.taxable}
                              onChange={(e) => updateProduct(product.id, 'taxable', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={product.isLabor}
                              onChange={(e) => updateProduct(product.id, 'isLabor', e.target.checked)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {product.total.toLocaleString('fr-FR')} CFA
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium text-gray-900">
                    {currentQuote.subtotal.toLocaleString('fr-FR')} CFA
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    BRS (main-d'œuvre)
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">5.00%</span>
                  </span>
                  <span className="font-medium text-orange-700">
                    -{currentQuote.brsAmount.toLocaleString('fr-FR')} CFA
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxe de vente</span>
                  <span className="font-medium text-gray-900">
                    {currentQuote.taxAmount.toLocaleString('fr-FR')} CFA
                  </span>
                </div>
                
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Autres</span>
                  <input
                    type="number"
                    min="0"
                    value={currentQuote.other}
                    onChange={(e) => {
                      const updatedQuote = { ...currentQuote, other: Number(e.target.value) }
                      calculateTotals(updatedQuote)
                    }}
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div className="pt-3 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg text-gray-900">TOTAL</span>
                    <span className="font-bold text-2xl text-blue-600">
                      {currentQuote.total.toLocaleString('fr-FR')} CFA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes additionnelles
              </label>
              <textarea
                value={currentQuote.notes || ''}
                onChange={(e) => setCurrentQuote({ ...currentQuote, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Conditions de paiement: 80%"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentQuote(null)
                  setActiveTab('list')
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={saveQuote}
                disabled={isSaving || !currentQuote.client.name || currentQuote.products.length === 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => sendQuoteByEmail(currentQuote)}
                disabled={sendingQuoteId === currentQuote.id || !currentQuote.client.email}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isObjectId(currentQuote.id) ? 'Sauvegardez d\'abord le devis' : ''}
              >
                <Send className="h-5 w-5" />
                {sendingQuoteId === currentQuote.id ? 'Envoi...' : 'Envoyer email'}
              </button>
              <button
                onClick={exportPDF}
                disabled={!currentQuote.client.name || currentQuote.products.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-5 w-5" />
                Exporter PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Catalogue produits */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Catalogue de produits</h3>
                <button
                  onClick={() => {
                    setShowProductModal(false)
                    setSearchProduct('')
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Rechercher un produit..."
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun produit trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {product.inStock && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              En stock
                            </span>
                          )}
                          {product.b2bPrice ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              Prix B2B
                            </span>
                          ) : null}
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between mt-4">
                        <div>
                          {product.b2bPrice ? (
                            <>
                              <span className="text-lg font-bold text-purple-600">
                                {product.b2bPrice.toLocaleString('fr-FR')} CFA
                              </span>
                              <span className="text-xs text-gray-400 ml-2 line-through">
                                {(product.price || 0).toLocaleString('fr-FR')}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-blue-600">
                              {(product.price || 0).toLocaleString('fr-FR')} CFA
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addProductToQuote(product)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

