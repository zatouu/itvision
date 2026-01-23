'use client'

import { useState, useEffect } from 'react'
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
  Check
} from 'lucide-react'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: string
  productId?: string
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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  client: InvoiceClient
  items: InvoiceItem[]
  subtotal: number
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
  const [activeTab, setActiveTab] = useState('list')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false)
  const [showQuoteImportModal, setShowQuoteImportModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)

  // Charger les données
  useEffect(() => {
    loadInvoices()
    loadQuotes()
  }, [])

  const loadInvoices = async () => {
    try {
      const res = await fetch('/api/admin/invoices', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur lors du chargement des factures')
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
    } catch (e) {
      // Fallback: garder le stockage local (dev/offline)
      const storedInvoices = localStorage.getItem('itvision-invoices')
      if (storedInvoices) {
        setInvoices(JSON.parse(storedInvoices))
      } else {
        setInvoices([])
      }
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

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear()
    const nextNumber = invoices.length + 1
    return `FAC-${year}-${nextNumber.toString().padStart(3, '0')}`
  }

  const saveInvoice = async (invoice: Invoice) => {
    const now = new Date().toISOString()

    try {
      const payload = {
        ...invoice,
        id: editingInvoice ? invoice.id : undefined,
        number: editingInvoice ? invoice.number : (invoice.number || generateInvoiceNumber()),
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
        const updated = exists ? prev.map(i => (i.id === saved.id ? saved : i)) : [saved, ...prev]
        localStorage.setItem('itvision-invoices', JSON.stringify(updated))
        return updated
      })
    } catch (e) {
      // fallback local
      const now2 = new Date().toISOString()
      if (editingInvoice) {
        setInvoices(prev => {
          const updated = prev.map(inv => inv.id === invoice.id ? { ...invoice, updatedAt: now2 } : inv)
          localStorage.setItem('itvision-invoices', JSON.stringify(updated))
          return updated
        })
      } else {
        const newInvoice: Invoice = {
          ...invoice,
          id: `inv-${Date.now()}`,
          number: generateInvoiceNumber(),
          createdAt: now2,
          updatedAt: now2,
          createdBy: 'Admin'
        }
        setInvoices(prev => {
          const updated = [...prev, newInvoice]
          localStorage.setItem('itvision-invoices', JSON.stringify(updated))
          return updated
        })
      }
      console.error(e)
    }

    setEditingInvoice(null)
    setShowNewInvoiceModal(false)
    setShowQuoteImportModal(false)
  }

  const createInvoiceFromQuote = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) return

    const baseHT = quote.total ? quote.total / 1.18 : 0
    const newInvoice: Partial<Invoice> = {
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      quoteId: quote.id,
      client: {
        id: 'client-quote',
        name: quote.client,
        company: '',
        email: '',
        phone: '',
        address: '',
        city: 'Dakar',
        postalCode: ''
      },
      items: [
        {
          id: 'item-quote',
          description: `Prestations selon devis ${quote.number}`,
          quantity: 1,
          unitPrice: baseHT,
          totalPrice: baseHT,
          category: 'services'
        }
      ],
      subtotal: baseHT,
      taxRate: 18,
      taxAmount: baseHT * 0.18,
      total: quote.total,
      notes: `Facture générée depuis le devis ${quote.number}`,
      terms: 'Paiement à 30 jours selon conditions devis.'
    }

    setEditingInvoice(newInvoice as Invoice)
    setShowQuoteImportModal(false)
    setShowNewInvoiceModal(true)
  }

  const updateInvoiceStatus = (invoiceId: string, newStatus: Invoice['status']) => {
    const paymentDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
    // Optimistic UI
    setInvoices(prev => {
      const updated = prev.map(inv => inv.id === invoiceId
        ? { ...inv, status: newStatus, updatedAt: new Date().toISOString(), ...(paymentDate ? { paymentDate } : {}) }
        : inv
      )
      localStorage.setItem('itvision-invoices', JSON.stringify(updated))
      return updated
    })

    fetch('/api/admin/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: invoiceId, status: newStatus, ...(paymentDate ? { paymentDate } : {}) })
    }).catch(() => {})
  }

  const deleteInvoice = (invoiceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      setInvoices(prev => {
        const updated = prev.filter(inv => inv.id !== invoiceId)
        localStorage.setItem('itvision-invoices', JSON.stringify(updated))
        return updated
      })
      fetch(`/api/admin/invoices?id=${encodeURIComponent(invoiceId)}`, {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => {})
    }
  }

  const exportInvoicePDF = async (invoice: Invoice) => {
    try {
      const res = await fetch('/api/admin/invoices/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invoice)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Erreur génération PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.number}-${invoice.client.company || invoice.client.name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      // fallback: ancien mode texte
      const pdfContent = generateInvoicePDF(invoice)
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.number}-${invoice.client.company || invoice.client.name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const sendInvoiceByEmail = async (invoice: Invoice) => {
    if (!invoice?.id) return
    try {
      setSendingInvoiceId(invoice.id)
      const res = await fetch('/api/admin/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: invoice.id })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Envoi impossible')
      }
      await loadInvoices()
      alert('Facture envoyée par email')
    } catch (e: any) {
      alert(e?.message || 'Erreur lors de l\'envoi')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const generateInvoicePDF = (invoice: Invoice) => {
    // Simulation contenu PDF - remplacer par vraie génération PDF
    return `
    FACTURE ${invoice.number}
    
    IT VISION SARL
    Adresse: [Votre adresse]
    Téléphone: +221 77 413 34 40
    Email: contact@itvision.sn
    
    FACTURER À:
    ${invoice.client.name}
    ${invoice.client.company}
    ${invoice.client.address}
    ${invoice.client.city}
    
    Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}
    Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
    
    DÉTAIL:
    ${invoice.items.map(item => 
      `${item.description} - Qté: ${item.quantity} - Prix: ${formatCurrency(item.unitPrice)} - Total: ${formatCurrency(item.totalPrice)}`
    ).join('\n')}
    
    Sous-total: ${formatCurrency(invoice.subtotal)}
    TVA (${invoice.taxRate}%): ${formatCurrency(invoice.taxAmount)}
    TOTAL: ${formatCurrency(invoice.total)}
    
    Notes: ${invoice.notes}
    Conditions: ${invoice.terms}
    `
  }

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = generateInvoiceHTML(invoice)
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const generateInvoiceHTML = (invoice: Invoice) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture ${invoice.number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .company { text-align: left; }
        .company h1 { color: #2563eb; margin: 0; font-size: 24px; }
        .company p { margin: 5px 0; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { color: #2563eb; margin: 0; font-size: 28px; }
        .client-info { margin: 30px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #2563eb; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table th, .items-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        .items-table th { background: #2563eb; color: white; font-weight: bold; }
        .items-table .amount { text-align: right; }
        .totals { margin-top: 30px; text-align: right; }
        .totals table { margin-left: auto; }
        .totals td { padding: 8px 15px; }
        .total-final { font-size: 18px; font-weight: bold; background: #2563eb; color: white; }
        .notes { margin-top: 40px; padding: 20px; background: #f1f5f9; border-radius: 8px; }
        .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <h1>🔧 IT VISION</h1>
          <p><strong>Spécialiste Sécurité & Digitalisation</strong></p>
          <p>📍 Dakar, Sénégal</p>
          <p>📞 +221 77 413 34 40</p>
          <p>✉️ contact@itvision.sn</p>
          <p>🌐 www.itvision.sn</p>
        </div>
        <div class="invoice-info">
          <h2>FACTURE</h2>
          <p><strong>${invoice.number}</strong></p>
          <p>Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
          <p>Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
          <p>Statut: <span style="color: ${getStatusColor(invoice.status)}">${getStatusLabel(invoice.status)}</span></p>
        </div>
      </div>

      <div class="client-info">
        <h3>📋 FACTURER À:</h3>
        <p><strong>${invoice.client.name}</strong></p>
        ${invoice.client.company ? `<p><strong>${invoice.client.company}</strong></p>` : ''}
        <p>${invoice.client.address}</p>
        <p>${invoice.client.city} ${invoice.client.postalCode}</p>
        <p>📞 ${invoice.client.phone}</p>
        <p>✉️ ${invoice.client.email}</p>
        ${invoice.client.taxId ? `<p>N° Fiscal: ${invoice.client.taxId}</p>` : ''}
      </div>

      ${invoice.project ? `
      <div style="margin: 20px 0; padding: 15px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <h4 style="margin: 0; color: #1e40af;">🚧 Projet: ${invoice.project.name}</h4>
        <p style="margin: 5px 0; color: #3730a3;">Phase: ${invoice.project.phase}</p>
      </div>
      ` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantité</th>
            <th>Prix Unitaire</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td class="amount">${formatCurrency(item.unitPrice)}</td>
            <td class="amount">${formatCurrency(item.totalPrice)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td><strong>Sous-total HT:</strong></td>
            <td class="amount"><strong>${formatCurrency(invoice.subtotal)}</strong></td>
          </tr>
          <tr>
            <td><strong>TVA (${invoice.taxRate}%):</strong></td>
            <td class="amount"><strong>${formatCurrency(invoice.taxAmount)}</strong></td>
          </tr>
          <tr class="total-final">
            <td><strong>TOTAL TTC:</strong></td>
            <td class="amount"><strong>${formatCurrency(invoice.total)}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div class="notes">
        <h4>📝 Notes:</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      ${invoice.terms ? `
      <div class="notes">
        <h4>📋 Conditions de paiement:</h4>
        <p>${invoice.terms}</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>Facture générée le ${new Date().toLocaleDateString('fr-FR')} par IT Vision - Système de gestion intégré</p>
        <p>🔒 Sécurité • 🏠 Domotique • 🌐 Réseaux • ⚡ Digitalisation</p>
      </div>
    </body>
    </html>
    `
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client.company.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
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
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'overdue': return <AlertTriangle className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTotalStats = () => {
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0)
    const pendingAmount = invoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).reduce((sum, inv) => sum + inv.total, 0)
    
    return { totalAmount, paidAmount, pendingAmount }
  }

  const stats = getTotalStats()

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🧾 Gestion des Factures
            </h1>
            <p className="text-gray-600">
              Création, suivi et gestion complète de vos factures IT Vision
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowQuoteImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <ArrowRight className="h-4 w-4" />
              <span>Devis → Facture</span>
            </button>
            
            <button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvelle Facture</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Facturé</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Encaissé</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Factures</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'list', label: 'Liste Factures', icon: FileText },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Paramètres', icon: Settings }
          ].map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Liste des factures */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Numéro, client, société..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="paid">Payée</option>
                  <option value="overdue">En retard</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table des factures */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Factures ({filteredInvoices.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.number}</div>
                          {invoice.quoteId && (
                            <div className="text-sm text-gray-500">
                              📄 Devis lié
                            </div>
                          )}
                          {invoice.project && (
                            <div className="text-sm text-blue-600">
                              🚧 {invoice.project.name}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.client.name}</div>
                          <div className="text-sm text-gray-600">{invoice.client.company}</div>
                          <div className="text-sm text-gray-500">{invoice.client.phone}</div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div>
                          <div className="text-gray-900">{new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
                          <div className="text-sm text-gray-500">
                            Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-bold text-green-600">
                          {formatCurrency(invoice.total)}
                        </div>
                        <div className="text-sm text-gray-500">
                          HT: {formatCurrency(invoice.subtotal)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <span style={{ color: getStatusColor(invoice.status) }}>
                            {getStatusIcon(invoice.status)}
                          </span>
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: getStatusColor(invoice.status) + '20',
                              color: getStatusColor(invoice.status)
                            }}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>
                        </div>
                        {invoice.paymentDate && (
                          <div className="text-xs text-green-600 mt-1">
                            Payé le {new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => setEditingInvoice(invoice)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Modifier"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => printInvoice(invoice)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Imprimer"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => exportInvoicePDF(invoice)}
                            className="text-orange-600 hover:text-orange-800 p-1"
                            title="Télécharger PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => sendInvoiceByEmail(invoice)}
                            disabled={sendingInvoiceId === invoice.id}
                            className="text-indigo-600 hover:text-indigo-800 p-1 disabled:opacity-60"
                            title="Envoyer par email"
                          >
                            <Send className="h-4 w-4" />
                          </button>

                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Marquer comme payée"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal conversion devis → facture */}
      {showQuoteImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                📄 Convertir Devis en Facture
              </h3>
              <button
                onClick={() => setShowQuoteImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Sélectionnez un devis approuvé pour générer automatiquement une facture :
              </p>

              <div className="space-y-4">
                {quotes.filter(q => q.status === 'approved').map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => createInvoiceFromQuote(quote.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{quote.number}</div>
                        <div className="text-gray-600">{quote.client}</div>
                        <div className="text-sm text-gray-500">
                          Date: {new Date(quote.date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(quote.total)}
                        </div>
                        <div className="text-sm text-green-600">
                          ✅ Approuvé
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {quotes.filter(q => q.status === 'approved').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun devis approuvé disponible</p>
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
            />
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
  onSave: (invoice: Invoice) => void
  onCancel: () => void
}) {
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
      taxRate: 18,
      taxAmount: 0,
      total: 0,
      notes: '',
      terms: 'Paiement à 30 jours selon conditions générales.',
      createdAt: '',
      updatedAt: '',
      createdBy: ''
    }
  )

  const updateCalculations = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const taxAmount = subtotal * (formData.taxRate / 100)
    const total = subtotal + taxAmount

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      total
    }))
  }

  useEffect(() => {
    updateCalculations()
  }, [formData.items, formData.taxRate])

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice
          }
          return updatedItem
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  return (
    <div>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          {invoice ? 'Modifier Facture' : 'Nouvelle Facture'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de facture</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Invoice['status'] }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>

        {/* Informations client */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">👤 Informations Client</h4>
          
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
              <input
                type="email"
                value={formData.client.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, email: e.target.value }
                }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
            <h4 className="text-lg font-semibold text-gray-900">📦 Articles</h4>
            <button
              onClick={addItem}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                        onClick={() => removeItem(index)}
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
          <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Totaux</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Sous-total HT:</span>
              <span className="font-bold">{formatCurrency(formData.subtotal)}</span>
            </div>
            
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
            
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>TOTAL TTC:</span>
                <span>{formatCurrency(formData.total)}</span>
              </div>
            </div>
          </div>
        </div>

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

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
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
  onDownload 
}: {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onPrint: () => void
  onDownload: () => void
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
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
      case 'paid': return 'Payée'
      case 'overdue': return 'En retard'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  return (
    <div>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          Facture {invoice.number}
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={onEdit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Edit3 className="h-4 w-4" />
            <span>Modifier</span>
          </button>
          
          <button
            onClick={onPrint}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer</span>
          </button>
          
          <button
            onClick={onDownload}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* En-tête facture */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">🔧 IT VISION</h2>
              <p className="text-blue-100">Spécialiste Sécurité & Digitalisation</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{invoice.number}</div>
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                {getStatusLabel(invoice.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">📅 Dates</h4>
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
            <h4 className="font-semibold text-gray-900 mb-3">👤 Client</h4>
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
            <h4 className="font-semibold text-blue-900 mb-2">🚧 Projet Associé</h4>
            <div className="text-blue-800">
              <div className="font-medium">{invoice.project.name}</div>
              <div className="text-sm">Phase: {invoice.project.phase}</div>
            </div>
          </div>
        )}

        {/* Articles */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">📦 Détail des Articles</h4>
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
            <div className="flex justify-between">
              <span className="text-gray-700">TVA ({invoice.taxRate}%):</span>
              <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="border-t border-green-300 pt-2">
              <div className="flex justify-between text-lg font-bold text-green-800">
                <span>TOTAL TTC:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes et conditions */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">📝 Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{invoice.notes}</p>
              </div>
            )}

            {invoice.terms && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">📋 Conditions</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{invoice.terms}</p>
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
    </div>
  )
}