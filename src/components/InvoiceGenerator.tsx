'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { 
  FileText, 
  Download, 
  Printer, 
  Save, 
  Plus, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Hash, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Send, 
  Copy, 
  Trash2, 
  Settings, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Calculator, 
  Target, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Zap, 
  Star, 
  Award, 
  Crown, 
  Shield, 
  Globe, 
  Smartphone, 
  Wifi, 
  Camera, 
  Home, 
  Cable, 
  Server, 
  Database, 
  Monitor, 
  HardDrive, 
  Layers, 
  Archive, 
  Tag, 
  BarChart3, 
  PieChart, 
  Activity, 
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Upload,
  Wallet,
  RotateCcw,
  MoreHorizontal,
  FolderKanban,
  Bell
} from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

const notify = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') =>
  useToast.getState().addToast(message, type, type === 'error' || type === 'warning' ? 7000 : 4000)

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  // Prix saisi ; unitPrice = prix affiché (majoré de la BRS sur la main-d'œuvre)
  netUnitPrice?: number
  totalPrice: number
  category: string
  productId?: string
  expenseId?: string
}

// Mêmes règles que src/lib/finance/billing.ts (le serveur recalcule à l'enregistrement)
type TaxRegime = 'brs' | 'tva' | 'none'
const BRS_RATE = 0.05
const DEFAULT_BRS_THRESHOLD = 25000
const LABOR_CATEGORY = 'services'

const OPEN_STATUSES: string[] = ['sent', 'overdue', 'partial']
const STATUS_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'open', label: 'À encaisser' },
  { id: 'overdue', label: 'En retard' },
  { id: 'partial', label: 'Acomptes' },
  { id: 'paid', label: 'Payées' },
  { id: 'cancelled', label: 'Annulées' },
]
const daysLate = (due: string) => Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000))

/** BRS par majoration : main-d'œuvre portée à net / 0,95, différence retenue ; le net à payer reste le prix saisi. */
function computeInvoiceAmounts(items: InvoiceItem[], regime: TaxRegime, taxRate: number, brsThreshold = DEFAULT_BRS_THRESHOLD) {
  const base = items.map(it => {
    const net = Math.round(it.netUnitPrice ?? it.unitPrice ?? 0)
    return { it, net, labor: it.category === LABOR_CATEGORY, netTotal: Math.round(it.quantity * net) }
  })
  const netLabor = base.filter(b => b.labor).reduce((sum, b) => sum + b.netTotal, 0)
  const brsOn = regime === 'brs' && netLabor > brsThreshold
  const priced = base.map(b => {
    const unitPrice = brsOn && b.labor ? Math.round(b.net / (1 - BRS_RATE)) : b.net
    return { ...b.it, netUnitPrice: b.net, unitPrice, totalPrice: Math.round(b.it.quantity * unitPrice) }
  })
  const subtotal = priced.reduce((sum, it) => sum + it.totalPrice, 0)
  const grossLabor = priced.filter((_, i) => base[i].labor).reduce((sum, it) => sum + it.totalPrice, 0)
  const brsAmount = brsOn ? grossLabor - netLabor : 0
  const rate = regime === 'tva' ? taxRate : 0
  const taxAmount = Math.round(subtotal * rate / 100)
  return { items: priced, subtotal, brsAmount, taxRate: rate, taxAmount, total: subtotal + taxAmount - brsAmount }
}

function invoiceRegime(invoice: Pick<Invoice, 'taxRegime' | 'taxRate'>): TaxRegime {
  return invoice.taxRegime || (invoice.taxRate > 0 ? 'tva' : 'brs')
}

function totalLabel(invoice: Invoice) {
  const regime = invoiceRegime(invoice)
  return regime === 'brs' ? 'NET À PAYER' : regime === 'tva' ? 'TOTAL TTC' : 'TOTAL'
}

interface InvoiceClient {
  id: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  taxId?: string
}

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  amountPaid?: number
  creditedAmount?: number
  balance?: number
  payments?: Array<{ _id?: string; amount: number; date: string; method?: string; reference?: string; note?: string }>
  creditNoteIds?: string[]
  client: InvoiceClient
  items: InvoiceItem[]
  subtotal: number
  taxRegime?: TaxRegime
  brsThreshold?: number
  brsAmount?: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string
  terms: string
  createdAt: string
  updatedAt: string
  createdBy: string
  quoteId?: string // Référence vers devis d'origine
  paymentMethod?: string
  paymentDate?: string
  project?: {
    id: string
    name: string
    phase: string
  }
  clientCompanyId?: string
  attachments?: Array<{ name: string; url: string; type: string; size: number; uploadedAt?: string; category?: string }>
}

interface QuoteReference {
  id: string
  number: string
  client: string
  total: number
  date: string
  status: string
}

export default function InvoiceGenerator() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<QuoteReference[]>([])
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentDialog, setPaymentDialog] = useState<Invoice | null>(null)
  const [creditDialog, setCreditDialog] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false)
  const [showQuoteImportModal, setShowQuoteImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendModalInvoice, setSendModalInvoice] = useState<Invoice | null>(null)
  const [sendContacts, setSendContacts] = useState<Array<{ id: string; nom: string; email: string; isPrimary: boolean }>>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [extraRecipient, setExtraRecipient] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Charger les données
  useEffect(() => {
    loadInvoices()
    loadQuotes()
    const search = new URLSearchParams(window.location.search).get('search')
    if (search) setSearchTerm(search.slice(0, 100))
  }, [])

  // La fiche ouverte suit les données rechargées (paiement, avoir, relance)
  useEffect(() => {
    setSelectedInvoice(prev => prev ? invoices.find(i => i.id === prev.id) || null : prev)
  }, [invoices])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [menu])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invoices', { 
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur lors du chargement des factures')
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
    } catch (e: any) {
      // Pas de copie locale : elle pourrait afficher des factures qui n'existent pas en base
      console.error(e)
      notify(e?.message || 'Impossible de charger les factures', 'error')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const loadQuotes = async () => {
    try {
      const res = await fetch('/api/admin/quotes', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur lors du chargement des devis')
      const list = Array.isArray(data?.quotes) ? data.quotes : []

      const normalized: QuoteReference[] = list.map((q: any) => ({
        id: String(q._id || q.id),
        number: String(q.numero || ''),
        client: String(q?.client?.name || ''),
        total: Number(q.total || 0),
        date: q.date ? new Date(q.date).toISOString().slice(0, 10) : '',
        status: String(q.status || '')
      }))

      setQuotes(normalized)
    } catch {
      setQuotes([])
    }
  }

  const saveInvoice = async (invoice: Invoice): Promise<boolean> => {
    const now = new Date().toISOString()

    try {
      const payload = {
        ...invoice,
        id: editingInvoice ? invoice.id : undefined,
        // Numéro attribué par le serveur (compteur atomique) pour toute nouvelle facture
        number: editingInvoice ? invoice.number : (invoice.number || ''),
        createdAt: invoice.createdAt || now,
        updatedAt: now
      }

      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur sauvegarde facture')

      const saved = data.invoice as Invoice
      setInvoices(prev => {
        const exists = prev.some(i => i.id === saved.id)
        return exists ? prev.map(i => (i.id === saved.id ? saved : i)) : [saved, ...prev]
      })
      notify(editingInvoice?.number ? `Facture ${saved.number} enregistrée` : `Facture ${saved.number} créée`)
    } catch (e: any) {
      // Pas de sauvegarde locale silencieuse : une facture doit exister en base pour faire foi
      console.error(e)
      notify(e?.message || 'La facture n\'a pas pu être enregistrée', 'error')
      return false
    }

    setEditingInvoice(null)
    setShowNewInvoiceModal(false)
    setShowQuoteImportModal(false)
    return true
  }

  const importFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/invoices/extract', {
        method: 'POST',
        body: form,
        credentials: 'include'
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Échec de l\'extraction')
      }
      const data = json.data
      const imported: Invoice = {
        id: `inv-temp-${Date.now()}`,
        number: data.numero || '',
        date: data.date || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        client: {
          id: 'imported',
          name: data.client?.name || '',
          company: data.client?.company || '',
          email: data.client?.email || '',
          phone: data.client?.phone || '',
          address: data.client?.address || '',
          city: 'Dakar',
          postalCode: '',
          taxId: data.client?.taxId
        },
        items: (data.items || []).map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          netUnitPrice: it.netUnitPrice != null ? Number(it.netUnitPrice) : undefined,
          totalPrice: Number(it.totalPrice) || 0,
          category: it.category || 'products'
        })),
        subtotal: Number(data.subtotal) || 0,
        taxRegime: data.taxRegime || (Number(data.taxRate) > 0 ? 'tva' : 'brs'),
        brsThreshold: Number(data.brsThreshold ?? DEFAULT_BRS_THRESHOLD),
        brsAmount: Number(data.brsAmount) || 0,
        taxRate: Number(data.taxRate ?? 0),
        taxAmount: Number(data.taxAmount) || 0,
        total: Number(data.total) || 0,
        notes: data.notes || '',
        terms: data.terms || 'Paiement à 30 jours selon conditions générales.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Admin'
      }
      setEditingInvoice(imported)
      setShowNewInvoiceModal(true)
      notify(`Fichier analysé : ${imported.items.length} ligne(s) reprise(s). Vérifiez puis enregistrez.`, 'info')
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'import', 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Conversion côté serveur : reprend lignes, client, société et projet du devis (visible au portail client)
  const createInvoiceFromQuote = async (quoteId: string) => {
    try {
      const res = await fetch('/api/admin/invoices/from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quoteId })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Conversion impossible')
      if (data.totalMismatch) {
        notify(`Total recalculé ${data.totalMismatch.invoice} F (devis : ${data.totalMismatch.quote} F). Vérifiez la facture ${data.numero}.`, 'warning')
      } else {
        notify(`Brouillon ${data.numero || ''} créé depuis le devis`)
      }
      setShowQuoteImportModal(false)
      await loadInvoices()
    } catch (e: any) {
      notify(e?.message || 'Conversion impossible', 'error')
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    const paymentDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: invoiceId, status: newStatus, ...(paymentDate ? { paymentDate } : {}) })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Mise à jour refusée')
      setInvoices(prev => prev.map(inv => inv.id === invoiceId
        ? { ...inv, status: newStatus, updatedAt: new Date().toISOString(), ...(paymentDate ? { paymentDate } : {}) }
        : inv
      ))
    } catch (e: any) {
      notify(e?.message || 'Mise à jour refusée', 'error')
      await loadInvoices()
    }
  }

  const recordPayment = (invoice: Invoice) => setPaymentDialog(invoice)

  const markPaid = async (invoice: Invoice) => {
    if (!confirm(`Marquer ${invoice.number} comme soldée (solde encaissé aujourd'hui) ?\n\nPour un acompte ou une autre date, utilisez plutôt « Encaisser ».`)) return
    await updateInvoiceStatus(invoice.id, 'paid')
    notify(`Facture ${invoice.number} marquée comme soldée`)
    await loadInvoices()
  }

  const rowActions = (inv: Invoice) => {
    const open = OPEN_STATUSES.includes(inv.status)
    const locked = inv.status === 'paid' || inv.status === 'cancelled'
    return [
      !locked && { label: 'Modifier', icon: Edit3, run: () => setEditingInvoice(inv) },
      { label: 'Aperçu / imprimer le PDF', icon: Printer, run: () => printInvoice(inv) },
      inv.status !== 'draft' && inv.status !== 'cancelled' && { label: 'Renvoyer par email', icon: Send, run: () => openSendModal(inv) },
      open && { label: 'Relancer le client', icon: Bell, run: () => remindClient(inv) },
      ['draft', 'sent', 'overdue'].includes(inv.status) && { label: 'Marquer comme soldée', icon: CheckCircle, run: () => markPaid(inv) },
      ['sent', 'overdue', 'partial', 'paid'].includes(inv.status) && { label: 'Émettre un avoir', icon: RotateCcw, run: () => issueCreditNote(inv) },
      inv.status === 'draft' && { label: 'Ajouter les frais refacturables', icon: Plus, run: () => addRebillableExpenses(inv) },
      inv.status === 'draft' && { label: 'Supprimer le brouillon', icon: Trash2, run: () => deleteInvoice(inv.id), danger: true },
    ].filter(Boolean) as Array<{ label: string; icon: any; run: () => void; danger?: boolean }>
  }

  const remindClient = async (invoice: Invoice) => {
    if (!confirm(`Envoyer une relance pour ${invoice.number} (reste dû ${formatCurrency(invoice.balance ?? invoice.total)}) ?`)) return
    const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/remind`, { method: 'POST', credentials: 'include' })
    const data = await res.json().catch(() => null)
    if (!res.ok) return notify(data?.error || 'Relance refusée', 'error')
    notify(`Relance envoyée à ${data?.to}${data?.copyTo ? ` — copie à ${data.copyTo}` : ''}`)
    await loadInvoices()
  }

  const issueCreditNote = (invoice: Invoice) => setCreditDialog(invoice)

  const addRebillableExpenses = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/rebill`, { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Chargement impossible')
      const expenses: any[] = data?.expenses || []
      if (expenses.length === 0) return notify('Aucun frais refacturable pour ce projet / client.', 'info')
      const list = expenses.map(e => `• ${e.numero} — ${e.label} : ${formatCurrency(e.amountHT)} HT`).join('\n')
      if (!confirm(`Ajouter ces frais à la facture (au coût HT) ?\n\n${list}`)) return
      const post = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/rebill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expenseIds: expenses.map(e => String(e._id)) })
      })
      const result = await post.json().catch(() => null)
      if (!post.ok) throw new Error(result?.error || 'Refacturation refusée')
      notify(`${expenses.length} frais ajouté(s) à ${invoice.number}`)
      await loadInvoices()
    } catch (e: any) {
      notify(e?.message || 'Refacturation refusée', 'error')
    }
  }

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Supprimer définitivement ce brouillon ?')) return
    try {
      const res = await fetch(`/api/admin/invoices?id=${encodeURIComponent(invoiceId)}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Suppression refusée')
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
      notify('Brouillon supprimé')
    } catch (e: any) {
      notify(e?.message || 'Suppression refusée', 'error')
    }
  }

  const fetchInvoicePdf = async (invoice: Invoice) => {
    const res = await fetch('/api/admin/invoices/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(invoice)
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Erreur lors de la génération du PDF')
    }
    return URL.createObjectURL(await res.blob())
  }

  const exportInvoicePDF = async (invoice: Invoice) => {
    try {
      const url = await fetchInvoicePdf(invoice)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.number}-${invoice.client.company || invoice.client.name}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e: any) {
      notify(e?.message || 'PDF indisponible', 'error')
    }
  }

  // Même PDF que celui envoyé au client, ouvert dans la visionneuse du navigateur (impression incluse)
  const printInvoice = async (invoice: Invoice) => {
    const win = window.open('', '_blank')
    try {
      const url = await fetchInvoicePdf(invoice)
      if (win) win.location.href = url
      else window.location.href = url
    } catch (e: any) {
      win?.close()
      notify(e?.message || 'PDF indisponible', 'error')
    }
  }

  const openSendModal = async (invoice: Invoice) => {
    if (!invoice?.id) return
    setSendModalInvoice(invoice)
    setSendModalOpen(true)
    setLoadingContacts(true)
    setSelectedRecipients([])
    try {
      if (invoice.clientCompanyId) {
        const res = await fetch(`/api/admin/clients/contacts?clientId=${encodeURIComponent(invoice.clientCompanyId)}`, { credentials: 'include' })
        const data = await res.json().catch(() => null)
        const contacts = Array.isArray(data?.contacts) ? data.contacts : []
        setSendContacts(contacts.map((c: any) => ({ id: String(c._id || c.id), nom: c.nom || '', email: c.email || '', isPrimary: Boolean(c.isPrimary) })))
        const primary = contacts.find((c: any) => c.isPrimary && c.email)
        const preselected: string[] = []
        if (primary?.email) preselected.push(primary.email)
        else if (invoice.client?.email) preselected.push(invoice.client.email)
        setSelectedRecipients(preselected)
      } else {
        setSendContacts([])
        if (invoice.client?.email) setSelectedRecipients([invoice.client.email])
      }
    } catch {
      setSendContacts([])
      if (invoice.client?.email) setSelectedRecipients([invoice.client.email])
    } finally {
      setLoadingContacts(false)
    }
  }

  const confirmSendInvoice = async () => {
    if (!sendModalInvoice) return
    const invoice = sendModalInvoice
    try {
      setSendingInvoiceId(invoice.id)
      const res = await fetch('/api/admin/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: invoice.id, recipients: selectedRecipients })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Envoi impossible')
      }
      await loadInvoices()
      if (data.delivery === 'simulated') {
        notify(`Facture ${invoice.number} publiée sur l'espace client, mais l'email n'est pas parti : serveur d'envoi non configuré.`, 'warning')
      } else {
        notify(`Facture ${invoice.number} envoyée à ${data.to || `${selectedRecipients.length} destinataire(s)`}${data.copyTo ? ` — copie à ${data.copyTo}` : ''}`)
      }
      setSendModalOpen(false)
      setSendModalInvoice(null)
    } catch (e: any) {
      notify(e?.message || 'Erreur lors de l\'envoi', 'error')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const term = searchTerm.trim().toLowerCase()
  const matchesStatusFilter = (invoice: Invoice, filter: string) =>
    filter === 'all' || (filter === 'open' ? OPEN_STATUSES.includes(invoice.status) : invoice.status === filter)
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !term || [invoice.number, invoice.client?.name, invoice.client?.company, invoice.project?.name]
      .some(v => String(v || '').toLowerCase().includes(term))
    return matchesSearch && matchesStatusFilter(invoice, statusFilter)
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
      case 'partial': return '#f59e0b'
      case 'paid': return '#10b981'
      case 'overdue': return '#ef4444'
      case 'cancelled': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon'
      case 'sent': return 'Envoyée'
      case 'partial': return 'Partiellement payée'
      case 'paid': return 'Payée'
      case 'overdue': return 'En retard'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return <Edit3 className="h-4 w-4" />
      case 'sent': return <Send className="h-4 w-4" />
      case 'partial': return <Wallet className="h-4 w-4" />
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'overdue': return <AlertTriangle className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTotalStats = () => {
    const totalAmount = invoices.filter(inv => inv.status !== 'draft' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.total, 0)
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.amountPaid ?? (inv.status === 'paid' ? inv.total : 0)), 0)
    const open = invoices.filter(inv => OPEN_STATUSES.includes(inv.status))
    const pendingAmount = open.reduce((sum, inv) => sum + (inv.balance ?? inv.total), 0)
    const overdue = invoices.filter(inv => inv.status === 'overdue')
    const overdueAmount = overdue.reduce((sum, inv) => sum + (inv.balance ?? inv.total), 0)
    return { totalAmount, paidAmount, pendingAmount, openCount: open.length, overdueAmount, overdueCount: overdue.length }
  }

  const stats = getTotalStats()
  const countFor = (filter: string) => invoices.filter(inv => matchesStatusFilter(inv, filter)).length
  const menuInvoice = menu ? invoices.find(i => i.id === menu.id) : null
  const invoicedQuoteIds = new Set(invoices.filter(i => i.quoteId && i.status !== 'cancelled').map(i => String(i.quoteId)))
  const billableQuotes = quotes.filter(q => q.status === 'accepted' && !invoicedQuoteIds.has(q.id))

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Factures</h1>
            <p className="text-gray-600">Création, envoi, encaissement et relance des factures clients</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={importFromFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              title="Reprendre une facture existante depuis un PDF ou un fichier Excel"
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm disabled:opacity-60"
            >
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{importing ? 'Analyse…' : 'Importer'}</span>
            </button>
            <button
              onClick={() => setShowQuoteImportModal(true)}
              className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
            >
              <ArrowRight className="h-4 w-4" />
              <span>Depuis un devis</span>
            </button>
            <button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle facture</span>
            </button>
          </div>
        </div>

        {/* Statistiques (cliquables : filtrent la liste) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { filter: 'all', label: 'Total facturé', value: formatCurrency(stats.totalAmount), sub: `${invoices.length} facture(s)`, icon: BarChart3, tone: 'text-gray-900', bg: 'bg-blue-100 text-blue-600' },
            { filter: 'paid', label: 'Encaissé', value: formatCurrency(stats.paidAmount), sub: 'acomptes compris', icon: CheckCircle, tone: 'text-green-600', bg: 'bg-green-100 text-green-600' },
            { filter: 'open', label: 'À encaisser', value: formatCurrency(stats.pendingAmount), sub: `${stats.openCount} facture(s) ouverte(s)`, icon: Clock, tone: 'text-orange-600', bg: 'bg-orange-100 text-orange-600' },
            { filter: 'overdue', label: 'En retard', value: formatCurrency(stats.overdueAmount), sub: stats.overdueCount ? `${stats.overdueCount} facture(s) à relancer` : 'Aucun retard', icon: AlertTriangle, tone: stats.overdueCount ? 'text-red-600' : 'text-gray-400', bg: 'bg-red-100 text-red-600' },
          ].map(k => (
            <button
              key={k.filter}
              onClick={() => setStatusFilter(statusFilter === k.filter ? 'all' : k.filter)}
              aria-pressed={statusFilter === k.filter}
              className={`text-left bg-white rounded-xl border p-5 transition hover:shadow-md ${statusFilter === k.filter && k.filter !== 'all' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600">{k.label}</p>
                  <p className={`text-xl xl:text-2xl font-bold truncate ${k.tone}`}>{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
                </div>
                <div className={`p-3 rounded-lg shrink-0 ${k.bg}`}><k.icon className="h-5 w-5" /></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des factures */}
      <div className="space-y-4">
          {/* Filtres */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Numéro, client, société, projet…"
                aria-label="Rechercher une facture"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(f => {
                const n = countFor(f.id)
                const active = statusFilter === f.id
                return (
                  <button key={f.id} onClick={() => setStatusFilter(f.id)} aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300'}`}>
                    {f.label} <span className={active ? 'text-blue-100' : 'text-gray-400'}>{n}</span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => loadInvoices()}
              disabled={loading}
              title="Actualiser"
              aria-label="Actualiser la liste"
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 self-start lg:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table des factures */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading && invoices.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />Chargement des factures…
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-gray-300" />
                {invoices.length === 0 ? (
                  <>
                    <p className="mt-3 font-medium text-gray-800">Aucune facture pour l&apos;instant</p>
                    <p className="text-sm text-gray-500 mt-1">Créez une facture, ou générez-la depuis un devis accepté.</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <button onClick={() => setShowQuoteImportModal(true)} className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">Depuis un devis</button>
                      <button onClick={() => setShowNewInvoiceModal(true)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Nouvelle facture</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-medium text-gray-800">Aucune facture ne correspond à ces critères</p>
                    <button onClick={() => { setSearchTerm(''); setStatusFilter('all') }} className="mt-2 text-sm text-blue-600 hover:underline">Réinitialiser les filtres</button>
                  </>
                )}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => {
                    const open = OPEN_STATUSES.includes(invoice.status)
                    const balance = invoice.balance ?? invoice.total
                    const late = invoice.status === 'overdue' ? daysLate(invoice.dueDate) : 0
                    const primary = invoice.status === 'draft'
                      ? { label: 'Envoyer', icon: Send, run: () => openSendModal(invoice), cls: 'bg-indigo-600 hover:bg-indigo-700' }
                      : open ? { label: 'Encaisser', icon: Wallet, run: () => recordPayment(invoice), cls: 'bg-emerald-600 hover:bg-emerald-700' } : null
                    return (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${invoice.status === 'overdue' ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 align-top">
                        <button onClick={() => setSelectedInvoice(invoice)} className="font-semibold text-gray-900 hover:text-blue-700 text-left">
                          {invoice.number || 'Brouillon sans numéro'}
                        </button>
                        <div className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
                        {invoice.quoteId && (
                          <div className="text-xs text-gray-500 flex items-center gap-1"><FileText className="h-3 w-3" />Issue d&apos;un devis</div>
                        )}
                        {invoice.project && (
                          <div className="text-xs text-blue-600 flex items-center gap-1"><FolderKanban className="h-3 w-3" />{invoice.project.name}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900">{invoice.client.company || invoice.client.name}</div>
                        {invoice.client.company && invoice.client.name && <div className="text-xs text-gray-500">{invoice.client.name}</div>}
                      </td>

                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {open || invoice.status === 'draft' ? (
                          <>
                            <div className={late ? 'text-red-700 font-medium' : 'text-gray-900'}>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</div>
                            {late > 0 && <div className="text-xs text-red-600">Retard de {late} j</div>}
                          </>
                        ) : invoice.paymentDate ? (
                          <div className="text-xs text-green-700">Payée le {new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}</div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        {open ? (
                          <>
                            <div className="font-bold text-gray-900">{formatCurrency(balance)}</div>
                            <div className="text-xs text-gray-500">{balance !== invoice.total ? `reste dû sur ${formatCurrency(invoice.total)}` : 'reste dû'}</div>
                          </>
                        ) : (
                          <div className={`font-bold ${invoice.status === 'paid' ? 'text-green-700' : 'text-gray-900'}`}>{formatCurrency(invoice.total)}</div>
                        )}
                        {(invoice.creditedAmount || 0) > 0 && (
                          <div className="text-xs text-gray-500">Avoirs : -{formatCurrency(invoice.creditedAmount || 0)}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                          style={{ backgroundColor: getStatusColor(invoice.status) + '20', color: getStatusColor(invoice.status) }}
                        >
                          {getStatusIcon(invoice.status)}
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {primary && (
                            <button onClick={primary.run} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold ${primary.cls}`}>
                              <primary.icon className="h-3.5 w-3.5" />{primary.label}
                            </button>
                          )}
                          <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Voir le détail" aria-label={`Voir ${invoice.number}`}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => exportInvoicePDF(invoice)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Télécharger le PDF" aria-label={`Télécharger le PDF de ${invoice.number}`}>
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect()
                              setMenu(menu?.id === invoice.id ? null : { id: invoice.id, top: r.bottom + 4, right: window.innerWidth - r.right })
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            title="Plus d'actions"
                            aria-label={`Plus d'actions pour ${invoice.number}`}
                            aria-haspopup="menu"
                            aria-expanded={menu?.id === invoice.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

      {menu && menuInvoice && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            role="menu"
            className="fixed z-50 w-60 bg-white rounded-xl border border-gray-200 shadow-xl py-1"
            style={{ top: Math.max(8, Math.min(menu.top, window.innerHeight - 360)), right: menu.right }}
          >
            {rowActions(menuInvoice).map(a => (
              <button
                key={a.label}
                role="menuitem"
                onClick={() => { setMenu(null); a.run() }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 ${a.danger ? 'text-red-600 border-t border-gray-100 mt-1' : 'text-gray-700'}`}
              >
                <a.icon className="h-4 w-4 shrink-0" />{a.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modal conversion devis → facture */}
      {showQuoteImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Facturer un devis accepté
              </h3>
              <button
                onClick={() => setShowQuoteImportModal(false)}
                aria-label="Fermer"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Choisissez un devis accepté par le client : un brouillon de facture est créé avec ses lignes, son client et son projet.
              </p>

              <div className="space-y-3">
                {billableQuotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                    onClick={() => createInvoiceFromQuote(quote.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{quote.number}</div>
                        <div className="text-gray-600">{quote.client}</div>
                        <div className="text-sm text-gray-500">
                          {quote.date ? new Date(quote.date).toLocaleDateString('fr-FR') : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(quote.total)}
                        </div>
                        <div className="text-sm text-blue-600 inline-flex items-center gap-1">
                          Créer la facture <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {billableQuotes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun devis accepté en attente de facturation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nouvelle facture/édition */}
      {(showNewInvoiceModal || editingInvoice) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <InvoiceForm
              invoice={editingInvoice}
              onSave={saveInvoice}
              onCancel={() => {
                setEditingInvoice(null)
                setShowNewInvoiceModal(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Modal détail facture */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <InvoiceDetailView
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onEdit={() => {
                setEditingInvoice(selectedInvoice)
                setSelectedInvoice(null)
              }}
              onPrint={() => printInvoice(selectedInvoice)}
              onDownload={() => exportInvoicePDF(selectedInvoice)}
              onPay={() => recordPayment(selectedInvoice)}
              onSend={() => openSendModal(selectedInvoice)}
              onRemind={() => remindClient(selectedInvoice)}
              onCreditNote={() => issueCreditNote(selectedInvoice)}
              onChanged={async () => {
                await loadInvoices()
              }}
            />
          </div>
        </div>
      )}

      {paymentDialog && (
        <PaymentDialog
          invoice={paymentDialog}
          onClose={() => setPaymentDialog(null)}
          onDone={async () => {
            setPaymentDialog(null)
            await loadInvoices()
          }}
        />
      )}

      {creditDialog && (
        <CreditNoteDialog
          invoice={creditDialog}
          onClose={() => setCreditDialog(null)}
          onDone={async () => {
            setCreditDialog(null)
            await loadInvoices()
          }}
        />
      )}

      {/* Modale sélection destinataires */}
      {sendModalOpen && sendModalInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Envoyer la facture {sendModalInvoice.number}</h3>
              <button onClick={() => setSendModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {loadingContacts ? (
              <p className="text-gray-500 text-sm">Chargement des contacts…</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">Sélectionnez les destinataires :</p>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {sendContacts.length === 0 && sendModalInvoice.client?.email && (
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(sendModalInvoice.client.email)}
                        onChange={(e) => {
                          const email = sendModalInvoice.client.email
                          setSelectedRecipients(prev => e.target.checked ? [...prev, email] : prev.filter(r => r !== email))
                        }}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm">{sendModalInvoice.client.email} (client)</span>
                    </label>
                  )}
                  {sendContacts.map(contact => (
                    <label key={contact.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(contact.email)}
                        onChange={(e) => {
                          setSelectedRecipients(prev => e.target.checked ? [...prev, contact.email] : prev.filter(r => r !== contact.email))
                        }}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <div className="text-sm">
                        <div className="font-medium">{contact.nom} {contact.isPrimary && <span className="text-xs text-indigo-600">(principal)</span>}</div>
                        <div className="text-gray-500">{contact.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <form
                  className="flex gap-2 mb-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const email = extraRecipient.trim().toLowerCase()
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notify('Adresse email invalide', 'error')
                    setSelectedRecipients(prev => prev.includes(email) ? prev : [...prev, email])
                    setExtraRecipient('')
                  }}
                >
                  <input
                    type="email"
                    value={extraRecipient}
                    onChange={(e) => setExtraRecipient(e.target.value)}
                    placeholder="Ajouter une autre adresse…"
                    aria-label="Ajouter un destinataire"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button type="submit" disabled={!extraRecipient.trim()} className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50">Ajouter</button>
                </form>
                {selectedRecipients.filter(r => r !== sendModalInvoice.client?.email && !sendContacts.some(c => c.email === r)).map(r => (
                  <div key={r} className="flex items-center justify-between text-sm bg-indigo-50 text-indigo-800 rounded-lg px-3 py-1.5 mb-2">
                    {r}
                    <button onClick={() => setSelectedRecipients(prev => prev.filter(x => x !== r))} aria-label={`Retirer ${r}`} className="text-indigo-500 hover:text-indigo-800"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex gap-3">
                  <button onClick={() => setSendModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button
                    onClick={confirmSendInvoice}
                    disabled={selectedRecipients.length === 0 || sendingInvoiceId === sendModalInvoice.id}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {sendingInvoiceId === sendModalInvoice.id ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Composant formulaire facture
function InvoiceForm({ 
  invoice, 
  onSave, 
  onCancel 
}: {
  invoice: Invoice | null
  onSave: (invoice: Invoice) => Promise<boolean>
  onCancel: () => void
}) {
  // Émise = lignes, client et montants figés côté serveur (correction par avoir)
  const isIssued = !!invoice?.id && invoice.status !== 'draft'
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [docCategory, setDocCategory] = useState('autre')
  const [formData, setFormData] = useState<Invoice>(
    invoice || {
      id: '',
      number: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      client: {
        id: '',
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        city: 'Dakar',
        postalCode: ''
      },
      items: [
        {
          id: 'item-1',
          description: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          category: 'services'
        }
      ],
      subtotal: 0,
      // Régime BRS par défaut (exclusif de la TVA)
      taxRegime: 'brs',
      brsThreshold: DEFAULT_BRS_THRESHOLD,
      brsAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      notes: '',
      terms: 'Paiement à 30 jours selon conditions générales.',
      createdAt: '',
      updatedAt: '',
      createdBy: ''
    }
  )

  useEffect(() => {
    setFormData(prev => {
      const a = computeInvoiceAmounts(prev.items, invoiceRegime(prev), prev.taxRate, prev.brsThreshold)
      const unchanged =
        a.subtotal === prev.subtotal && a.brsAmount === (prev.brsAmount || 0) && a.taxAmount === prev.taxAmount && a.total === prev.total &&
        a.items.every((it, i) => it.unitPrice === prev.items[i].unitPrice && it.totalPrice === prev.items[i].totalPrice && it.netUnitPrice === prev.items[i].netUnitPrice)
      // Retourner l'état inchangé évite une boucle de rendu (l'effet dépend des lignes qu'il réécrit)
      return unchanged ? prev : { ...prev, items: a.items, subtotal: a.subtotal, brsAmount: a.brsAmount, taxAmount: a.taxAmount, total: a.total }
    })
  }, [formData.items, formData.taxRate, formData.taxRegime])

  const setRegime = (regime: TaxRegime) => {
    setFormData(prev => ({ ...prev, taxRegime: regime, taxRate: regime === 'tva' ? (prev.taxRate || 18) : 0 }))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value }
        }
        return item
      })
    }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          category: 'services'
        }
      ]
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const uploadAttachment = async (file: File, category: string = 'autre') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    const res = await fetch('/api/admin/documents/upload', { method: 'POST', body: formData, credentials: 'include' })
    if (!res.ok) throw new Error('Upload échoué')
    const data = await res.json()
    const att = { name: data.name, url: data.url || data.staticUrl, type: file.type || 'application/octet-stream', size: file.size, category: data.category }
    setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), att] }))
  }

  const removeAttachment = (url: string) => {
    setFormData(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.url !== url) }))
  }

  const [clientQuery, setClientQuery] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [clientSearching, setClientSearching] = useState(false)
  const [clientEmails, setClientEmails] = useState<string[]>([])

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

  const selectClient = async (c: any) => {
    const companyId = String(c._id || c.id || '')
    const emails: string[] = [c.email || ''].filter(Boolean)
    if (companyId) {
      try {
        const res = await fetch(`/api/admin/clients/contacts?clientId=${encodeURIComponent(companyId)}`, { credentials: 'include' })
        const data = await res.json().catch(() => null)
        const contacts = Array.isArray(data?.contacts) ? data.contacts : []
        contacts.forEach((contact: any) => {
          if (contact.email && !emails.includes(contact.email)) emails.push(contact.email)
        })
      } catch { /* ignore */ }
    }
    setClientEmails(emails)
    setFormData(prev => ({
      ...prev,
      clientCompanyId: companyId,
      client: {
        ...prev.client,
        name: c.company || c.name || '',
        company: c.company || c.name || '',
        address: c.address || '',
        phone: c.phone || '',
        email: emails[0] || c.email || '',
        taxId: c.ninea || c.taxId || prev.client.taxId
      }
    }))
    setClientQuery(c.company || c.name || '')
    setShowClientDrop(false)
    setClientResults([])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  // Champs saisis seulement : le recalcul automatique des montants ne compte pas comme une modification
  const snapshotOf = (d: Invoice) => JSON.stringify([
    d.client, d.date, d.dueDate, d.status, d.notes, d.terms, d.attachments, d.taxRegime, d.taxRate,
    d.items.map(i => [i.description, i.quantity, i.netUnitPrice ?? i.unitPrice, i.category]),
  ])
  const [initialSnapshot] = useState(() => snapshotOf(formData))
  const isDirty = snapshotOf(formData) !== initialSnapshot

  const setDueInDays = (days: number) => {
    const base = new Date(formData.date || Date.now())
    base.setDate(base.getDate() + days)
    setFormData(prev => ({ ...prev, dueDate: base.toISOString().split('T')[0] }))
  }
  const dueInDays = formData.date && formData.dueDate
    ? Math.round((new Date(formData.dueDate).getTime() - new Date(formData.date).getTime()) / 86_400_000)
    : null

  const validate = () => {
    const e: string[] = []
    if (!isIssued) {
      if (!formData.client.name.trim() && !formData.client.company.trim()) e.push('Indiquez le client (nom du contact ou société).')
      const filled = formData.items.filter(it => it.description.trim())
      if (filled.length === 0) e.push('Ajoutez au moins une ligne avec une description.')
      formData.items.forEach((it, i) => {
        if (!it.description.trim()) return
        if (!(Number(it.quantity) >= 1)) e.push(`Ligne ${i + 1} : quantité minimale 1.`)
        if (!(Number(it.netUnitPrice ?? it.unitPrice) > 0)) e.push(`Ligne ${i + 1} : prix unitaire manquant.`)
      })
      if (formData.date && formData.dueDate && formData.dueDate < formData.date) e.push("L'échéance précède la date de facture.")
    }
    if (formData.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client.email)) e.push('Email du client invalide.')
    return e
  }

  const submit = async () => {
    const found = validate()
    setErrors(found)
    if (found.length) return
    setSaving(true)
    try {
      await onSave(isIssued ? formData : { ...formData, items: formData.items.filter(it => it.description.trim()) })
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    if (isDirty && !confirm('Abandonner les modifications non enregistrées ?')) return
    onCancel()
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {invoice?.id ? `Modifier la facture ${invoice.number || ''}` : 'Nouvelle facture'}
          </h3>
          {!invoice?.id && <p className="text-xs text-gray-500">Le numéro est attribué automatiquement à l&apos;enregistrement.</p>}
        </div>
        <button
          onClick={cancel}
          aria-label="Fermer"
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {isIssued && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Facture émise : client, lignes et montants sont figés (numérotation et trace comptable). Vous pouvez modifier les notes, les conditions et les pièces jointes ; pour corriger un montant, émettez un avoir.
          </div>
        )}

        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de facture</label>
            <input
              type="date"
              value={formData.date}
              disabled={isIssued}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Échéance {dueInDays !== null && dueInDays >= 0 && <span className="text-gray-400 font-normal">({dueInDays === 0 ? 'à réception' : `${dueInDays} j`})</span>}
            </label>
            <input
              type="date"
              value={formData.dueDate}
              min={formData.date}
              disabled={isIssued}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {!isIssued && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[0, 15, 30, 45, 60].map(d => (
                  <button key={d} type="button" onClick={() => setDueInDays(d)}
                    className={`px-2 py-0.5 rounded-full text-xs border ${dueInDays === d ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-300'}`}>
                    {d === 0 ? 'À réception' : `${d} j`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            {isIssued ? (
              <p className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
                {({ sent: 'Envoyée', partial: 'Partiellement payée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' } as Record<string, string>)[formData.status] || formData.status}
                <span className="block text-xs text-gray-500">Se change depuis la liste : encaisser, relancer, avoir.</span>
              </p>
            ) : (
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Invoice['status'] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Brouillon (modifiable)</option>
                <option value="sent">Émise (envoyée au client)</option>
                <option value="paid">Déjà payée (saisie a posteriori)</option>
              </select>
            )}
          </div>
        </div>

        <fieldset disabled={isIssued} className="space-y-6 disabled:opacity-70">
        {/* Informations client */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Client</h4>

          {/* Recherche client */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un client entreprise</label>
            <input
              type="text"
              value={clientQuery}
              onChange={(e) => {
                setClientQuery(e.target.value)
                searchClients(e.target.value)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Saisir le nom de l'entreprise..."
            />
            {clientSearching && <p className="text-xs text-gray-500 mt-1">Recherche…</p>}
            {showClientDrop && clientResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {clientResults.map((c: any) => (
                  <button
                    key={c._id || c.id}
                    type="button"
                    onClick={() => selectClient(c)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium">{c.company || c.name}</div>
                    <div className="text-sm text-gray-500">{c.email} · {c.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du contact</label>
              <input
                type="text"
                value={formData.client.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, name: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Société</label>
              <input
                type="text"
                value={formData.client.company}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, company: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              {clientEmails.length > 1 ? (
                <select
                  value={formData.client.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {clientEmails.map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                  <option value="">Autre email…</option>
                </select>
              ) : (
                <input
                  type="email"
                  value={formData.client.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
              {clientEmails.length > 1 && !clientEmails.includes(formData.client.email) && (
                <input
                  type="email"
                  value={formData.client.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    client: { ...prev.client, email: e.target.value }
                  }))}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Saisir un autre email"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="text"
                value={formData.client.phone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, phone: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
              <input
                type="text"
                value={formData.client.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, address: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Articles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Lignes</h4>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Description de l'article..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={item.category === LABOR_CATEGORY ? LABOR_CATEGORY : 'products'}
                      onChange={(e) => updateItem(index, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      title="La BRS porte uniquement sur la main-d'œuvre"
                    >
                      <option value="products">Fourniture</option>
                      <option value={LABOR_CATEGORY}>Main-d'œuvre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      step="any"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire</label>
                    <input
                      type="number"
                      value={item.netUnitPrice ?? item.unitPrice}
                      onChange={(e) => updateItem(index, 'netUnitPrice', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    {item.netUnitPrice != null && item.unitPrice !== item.netUnitPrice && (
                      <p className="text-[11px] text-gray-500 mt-1" title="BRS par majoration : le net saisi est conservé après retenue">
                        Affiché {formatCurrency(item.unitPrice)} (BRS)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-green-600 font-bold">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>

                  <div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        aria-label={`Supprimer la ligne ${index + 1}`}
                        title="Supprimer la ligne"
                        className="w-full bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totaux */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Totaux</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Sous-total HT:</span>
              <span className="font-bold">{formatCurrency(formData.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Régime fiscal:</span>
              <select
                value={invoiceRegime(formData)}
                onChange={(e) => setRegime(e.target.value as TaxRegime)}
                className="px-2 py-1 border border-gray-300 rounded"
              >
                <option value="brs">BRS 5 % (sans TVA)</option>
                <option value="tva">TVA (sans BRS)</option>
                <option value="none">Ni BRS ni TVA</option>
              </select>
            </div>

            {invoiceRegime(formData) === 'brs' && (
              <div className="flex justify-between">
                <span className="text-gray-700">
                  BRS 5 % <span className="text-xs text-gray-500">(main-d'œuvre &gt; {formatCurrency(formData.brsThreshold ?? DEFAULT_BRS_THRESHOLD)})</span>:
                </span>
                <span className="font-bold text-red-600">-{formatCurrency(formData.brsAmount || 0)}</span>
              </div>
            )}

            {invoiceRegime(formData) === 'tva' && (
            <div className="flex justify-between items-center">
              <span className="text-gray-700">TVA:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  min="0"
                  max="100"
                />
                <span>%</span>
                <span className="font-bold">{formatCurrency(formData.taxAmount)}</span>
              </div>
            </div>
            )}
            
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>{totalLabel(formData)}:</span>
                <span>{formatCurrency(formData.total)}</span>
              </div>
            </div>
          </div>
        </div>
        </fieldset>

        {/* Notes et conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Notes additionnelles..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conditions de paiement</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Conditions de paiement..."
            />
          </div>
        </div>

        {/* Documents joints */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Documents joints</label>
          <div className="space-y-2">
            {(formData.attachments || []).map(att => (
              <div key={att.url} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[70%]">
                  {att.name} {att.category ? `(${att.category})` : ''}
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.url)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Retirer le document"
                  aria-label={`Retirer ${att.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                aria-label="Type de document"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="cheque">Chèque</option>
                <option value="bon_commande">Bon de commande</option>
                <option value="recu">Reçu de versement</option>
                <option value="contrat">Contrat</option>
                <option value="autre">Autre</option>
              </select>
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      await uploadAttachment(file, docCategory)
                    } catch (err: any) {
                      notify(err.message || "Échec de l'envoi du fichier", 'error')
                    }
                    e.target.value = ''
                  }}
                />
                <span className="block w-full text-center px-4 py-2 border border-dashed border-gray-400 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  + Ajouter un document
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        {errors.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium mb-1">À corriger avant d&apos;enregistrer :</p>
            <ul className="list-disc pl-5 space-y-0.5">{errors.map(e => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {totalLabel(formData)} : <strong className="text-gray-900">{formatCurrency(formData.total)}</strong>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={cancel}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Composant vue détail facture
function InvoiceDetailView({ 
  invoice, 
  onClose, 
  onEdit, 
  onPrint, 
  onDownload,
  onChanged,
  onPay,
  onSend,
  onRemind,
  onCreditNote
}: {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onPrint: () => void
  onDownload: () => void
  onChanged: () => void
  onPay: () => void
  onSend: () => void
  onRemind: () => void
  onCreditNote: () => void
}) {
  const [creditNotes, setCreditNotes] = useState<any[]>([])
  const [cancellingPayment, setCancellingPayment] = useState<{ id: string; amount: number; date: string } | null>(null)
  const [refundingNote, setRefundingNote] = useState<any | null>(null)
  const open = OPEN_STATUSES.includes(invoice.status)
  const locked = invoice.status === 'paid' || invoice.status === 'cancelled'
  const balance = invoice.balance ?? (open ? invoice.total : 0)
  const late = invoice.status === 'overdue' ? daysLate(invoice.dueDate) : 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !cancellingPayment && !refundingNote) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, cancellingPayment, refundingNote])

  useEffect(() => {
    if (!invoice.creditNoteIds?.length) return
    fetch(`/api/admin/credit-notes?invoiceId=${encodeURIComponent(invoice.id)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCreditNotes(d?.creditNotes || []))
      .catch(() => {})
  }, [invoice.id, invoice.creditNoteIds?.length])

  const cancelPayment = async (paymentId: string, reason: string) => {
    const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/payments?paymentId=${encodeURIComponent(paymentId)}&reason=${encodeURIComponent(reason)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'Annulation refusée')
    notify('Paiement annulé')
    setCancellingPayment(null)
    onChanged()
  }

  const markRefunded = async (creditNoteId: string, method: string) => {
    const res = await fetch(`/api/admin/credit-notes/${encodeURIComponent(creditNoteId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ method })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'Opération refusée')
    notify('Remboursement enregistré')
    setRefundingNote(null)
    setCreditNotes(prev => prev.map(c => c._id === creditNoteId ? data.creditNote : c))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
      case 'partial': return '#f59e0b'
      case 'paid': return '#10b981'
      case 'overdue': return '#ef4444'
      case 'cancelled': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon'
      case 'sent': return 'Envoyée'
      case 'partial': return 'Partiellement payée'
      case 'paid': return 'Payée'
      case 'overdue': return 'En retard'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-gray-900">Facture {invoice.number || '(brouillon)'}</h3>
          <p className="text-sm text-gray-500 truncate">{invoice.client.company || invoice.client.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <button onClick={onSend} className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 text-sm font-semibold">
              <Send className="h-4 w-4" />Envoyer
            </button>
          )}
          {open && (
            <button onClick={onPay} className="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 text-sm font-semibold">
              <Wallet className="h-4 w-4" />Encaisser
            </button>
          )}
          {open && (
            <button onClick={onRemind} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm">
              <Bell className="h-4 w-4" />Relancer
            </button>
          )}
          {!locked && (
            <button onClick={onEdit} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm">
              <Edit3 className="h-4 w-4" />Modifier
            </button>
          )}
          {['sent', 'overdue', 'partial', 'paid'].includes(invoice.status) && (
            <button onClick={onCreditNote} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-sm">
              <RotateCcw className="h-4 w-4" />Avoir
            </button>
          )}
          <button onClick={onPrint} title="Aperçu / imprimer" aria-label="Aperçu et impression" className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            <Printer className="h-4 w-4" />
          </button>
          <button onClick={onDownload} title="Télécharger le PDF" aria-label="Télécharger le PDF" className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={onClose} aria-label="Fermer" className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Synthèse */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Statut</p>
            <p className="mt-1 font-semibold" style={{ color: getStatusColor(invoice.status) }}>{getStatusLabel(invoice.status)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{totalLabel(invoice)}</p>
            <p className="mt-1 font-semibold text-gray-900">{formatCurrency(invoice.total)}</p>
          </div>
          <div className={`rounded-lg border p-3 ${open ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-500">Reste dû</p>
            <p className={`mt-1 font-semibold ${open ? 'text-amber-800' : 'text-gray-900'}`}>{formatCurrency(balance)}</p>
          </div>
          <div className={`rounded-lg border p-3 ${late ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-500">Échéance</p>
            <p className={`mt-1 font-semibold ${late ? 'text-red-700' : 'text-gray-900'}`}>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
            {late > 0 && <p className="text-xs text-red-600">Retard de {late} j</p>}
          </div>
        </div>

        {/* Informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Dates</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date facture:</span>
                <span className="font-medium">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Échéance:</span>
                <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
              {invoice.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payée le:</span>
                  <span className="font-medium text-green-600">{new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Client</h4>
            <div className="space-y-1 text-sm">
              <div className="font-medium">{invoice.client.name}</div>
              {invoice.client.company && <div className="font-medium">{invoice.client.company}</div>}
              <div className="text-gray-600">{invoice.client.address}</div>
              <div className="text-gray-600">{invoice.client.city} {invoice.client.postalCode}</div>
              <div className="text-gray-600">{invoice.client.phone}</div>
              <div className="text-gray-600">{invoice.client.email}</div>
            </div>
          </div>
        </div>

        {/* Projet lié */}
        {invoice.project && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Projet associé</h4>
            <div className="text-blue-800">
              <div className="font-medium">{invoice.project.name}</div>
              <div className="text-sm">Phase: {invoice.project.phase}</div>
            </div>
          </div>
        )}

        {/* Articles */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Lignes</h4>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Qté</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Prix Unit.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totaux */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Sous-total HT:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoiceRegime(invoice) === 'brs' && (
              <div className="flex justify-between">
                <span className="text-gray-700">BRS 5 % (main-d'œuvre):</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoice.brsAmount || 0)}</span>
              </div>
            )}
            {invoiceRegime(invoice) === 'tva' && (
              <div className="flex justify-between">
                <span className="text-gray-700">TVA ({invoice.taxRate}%):</span>
                <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="border-t border-green-300 pt-2">
              <div className="flex justify-between text-lg font-bold text-green-800">
                <span>{totalLabel(invoice)}:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {((invoice.payments && invoice.payments.length > 0) || (invoice.creditedAmount || 0) > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Règlements</h4>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
              {(invoice.payments || []).map((p, i) => (
                <div key={p._id || i} className="flex justify-between items-center px-4 py-2">
                  <span className="text-gray-700">
                    {new Date(p.date).toLocaleDateString('fr-FR')}{p.method ? ` — ${p.method}` : ''}{p.reference ? ` (${p.reference})` : ''}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                    {p._id && invoice.status !== 'cancelled' && (
                      <button onClick={() => setCancellingPayment({ id: p._id!, amount: p.amount, date: p.date })} className="text-xs text-red-600 hover:underline" title="Annuler un paiement saisi par erreur">
                        Annuler
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {creditNotes.map(c => (
                <div key={c._id} className="flex justify-between items-center px-4 py-2">
                  <a href={`/api/admin/credit-notes/${c._id}/pdf?inline=1`} target="_blank" rel="noopener noreferrer" className="text-gray-700 underline">
                    Avoir {c.numero} — {c.reason}
                  </a>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-gray-700">-{formatCurrency(c.total)}</span>
                    {c.refundStatus === 'pending' && (
                      <button onClick={() => setRefundingNote(c)} className="text-xs text-amber-700 hover:underline" title="Le trop-perçu a été rendu au client">
                        Rembourser {formatCurrency(c.refundAmount)}
                      </button>
                    )}
                    {c.refundStatus === 'refunded' && <span className="text-xs text-green-700">Remboursé</span>}
                  </span>
                </div>
              ))}
              {(invoice.creditedAmount || 0) > 0 && creditNotes.length === 0 && (
                <div className="flex justify-between px-4 py-2">
                  <span className="text-gray-700">Avoirs émis</span>
                  <span className="font-medium text-gray-700">-{formatCurrency(invoice.creditedAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2 font-semibold">
                <span>Reste dû</span>
                <span>{formatCurrency(invoice.balance ?? 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Documents joints */}
        {(invoice.attachments && invoice.attachments.length > 0) && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Documents joints</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {invoice.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{att.name}</div>
                    <div className="text-xs text-gray-500">{att.category || 'Document'} — {(att.size / 1024).toFixed(1)} Ko</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notes et conditions */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {invoice.terms && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Conditions</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Métadonnées */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Créée le {new Date(invoice.createdAt).toLocaleDateString('fr-FR')} par {invoice.createdBy}</div>
            <div>Dernière modification le {new Date(invoice.updatedAt).toLocaleDateString('fr-FR')}</div>
            {invoice.quoteId && (
              <div>Générée depuis le devis {invoice.quoteId}</div>
            )}
          </div>
        </div>
      </div>

      {cancellingPayment && (
        <ConfirmWithInputDialog
          title="Annuler un paiement"
          description={`Paiement de ${formatCurrency(cancellingPayment.amount)} du ${new Date(cancellingPayment.date).toLocaleDateString('fr-FR')}. Le reste dû et le statut de la facture seront recalculés ; l'annulation est tracée dans le journal d'audit.`}
          label="Motif de l'annulation (obligatoire)"
          confirmLabel="Annuler le paiement"
          danger
          onClose={() => setCancellingPayment(null)}
          onConfirm={(reason) => cancelPayment(cancellingPayment.id, reason)}
        />
      )}
      {refundingNote && (
        <ConfirmWithInputDialog
          title={`Remboursement de l'avoir ${refundingNote.numero}`}
          description={`Confirmez que ${formatCurrency(refundingNote.refundAmount)} ont été rendus au client.`}
          label="Mode de remboursement"
          options={PAYMENT_METHODS}
          initialValue="Virement"
          confirmLabel="Marquer comme remboursé"
          onClose={() => setRefundingNote(null)}
          onConfirm={(method) => markRefunded(refundingNote._id, method)}
        />
      )}
    </div>
  )
}

// Corporate B2B : règlement surtout par virement (le mobile money concerne Xeuy / DDM+)
const PAYMENT_METHODS = ['Virement', 'Chèque', 'Espèces', 'Effet de commerce', 'Autre']
const fmtFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA'
const parseAmount = (v: string) => Math.round(Number(String(v).replace(/\s/g, '').replace(',', '.')) || 0)

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Confirmation qui exige une saisie (motif) ou un choix (mode), avec erreur affichée sur place. */
function ConfirmWithInputDialog({ title, description, label, options, initialValue = '', confirmLabel, danger, onClose, onConfirm }: {
  title: string
  description: string
  label: string
  options?: string[]
  initialValue?: string
  confirmLabel: string
  danger?: boolean
  onClose: () => void
  onConfirm: (value: string) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return setError('Ce champ est obligatoire')
    setSaving(true)
    setError('')
    try {
      await onConfirm(value.trim().slice(0, 300))
    } catch (err: any) {
      setError(err?.message || 'Opération refusée')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>
        <label className="block text-sm text-gray-700">{label}
          {options ? (
            <select value={value} onChange={e => setValue(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <textarea value={value} onChange={e => setValue(e.target.value)} rows={3} autoFocus className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          )}
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Retour</button>
          <button type="submit" disabled={saving} className={`px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'}`}>
            {saving ? 'Enregistrement…' : confirmLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

function PaymentDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const balance = invoice.balance ?? invoice.total
  const [amount, setAmount] = useState(String(balance))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState(PAYMENT_METHODS.includes(invoice.paymentMethod || '') ? invoice.paymentMethod! : 'Virement')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const value = parseAmount(amount)
    if (value <= 0 || value > balance) return setError(`Montant entre 1 et ${fmtFcfa(balance)}`)
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: value, date, method, reference: reference || undefined })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Paiement refusé')
      notify(value === balance ? `Facture ${invoice.number} soldée` : `Acompte de ${fmtFcfa(value)} enregistré — reste ${fmtFcfa(balance - value)}`)
      onDone()
    } catch (e: any) {
      setError(e?.message || 'Paiement refusé')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell title={`Encaissement — ${invoice.number}`} onClose={onClose}>
      <p className="text-sm text-gray-600">Reste dû : <strong>{fmtFcfa(balance)}</strong></p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-700 col-span-2">Montant encaissé
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" autoFocus className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            {[{ label: 'Solde', v: balance }, { label: '50 %', v: Math.round(balance / 2) }, { label: '30 %', v: Math.round(balance * 0.3) }].map(q => (
              <button key={q.label} type="button" onClick={() => setAmount(String(q.v))} className="px-2 py-0.5 rounded-full border border-gray-300 hover:border-green-400">{q.label}</button>
            ))}
            {parseAmount(amount) > 0 && parseAmount(amount) <= balance && (
              <span className="ml-auto">{parseAmount(amount) === balance ? 'La facture sera soldée' : `Restera ${fmtFcfa(balance - parseAmount(amount))}`}</span>
            )}
          </span>
        </label>
        <label className="text-sm text-gray-700">Date
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
        <label className="text-sm text-gray-700">Mode
          <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700 col-span-2">{method === 'Virement' ? 'Référence du virement (relevé bancaire)' : method === 'Chèque' ? 'N° de chèque' : 'Référence'}
          <input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Annuler</button>
        <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </button>
      </div>
    </DialogShell>
  )
}

function CreditNoteDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const creditable = invoice.total - (invoice.creditedAmount || 0)
  const [full, setFull] = useState(true)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!reason.trim()) return setError('Le motif est obligatoire')
    const value = full ? undefined : parseAmount(amount)
    if (value !== undefined && (value <= 0 || value > creditable)) return setError(`Montant entre 1 et ${fmtFcfa(creditable)}`)
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}/credit-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim(), amount: value })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Avoir refusé')
      const refund = Number(data?.refundAmount || 0)
      if (refund > 0) notify(`Avoir ${data?.creditNote?.numero || ''} émis. Trop-perçu à rembourser au client : ${fmtFcfa(refund)}.`, 'warning')
      else notify(`Avoir ${data?.creditNote?.numero || ''} émis`)
      if (data?.creditNote?._id) window.open(`/api/admin/credit-notes/${data.creditNote._id}/pdf?inline=1`, '_blank')
      onDone()
    } catch (e: any) {
      setError(e?.message || 'Avoir refusé')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell title={`Avoir sur ${invoice.number}`} onClose={onClose}>
      <p className="text-sm text-gray-600">Montant encore créditable : <strong>{fmtFcfa(creditable)}</strong></p>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={full} onChange={() => setFull(true)} /> Avoir total</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!full} onChange={() => setFull(false)} /> Avoir partiel</label>
      </div>
      {!full && (
        <label className="block text-sm text-gray-700">Montant
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="numeric" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>
      )}
      <label className="block text-sm text-gray-700">Motif (figure sur l&apos;avoir)
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Annuler</button>
        <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-60">
          {saving ? 'Émission…' : 'Émettre l’avoir'}
        </button>
      </div>
    </DialogShell>
  )
}