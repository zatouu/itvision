'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Building, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  Star, 
  TrendingUp, 
  BarChart3, 
  Filter, 
  Search, 
  RefreshCw, 
  ArrowDown, 
  ArrowUp, 
  Minus, 
  Plus, 
  X, 
  Check,
  Send,
  Archive,
  Award,
  Target,
  Zap,
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
  Package,
  Tag,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'

interface ClientInvoice {
  id: string
  number: string
  date: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  amount: number
  paidAmount: number
  description: string
  project?: {
    id: string
    name: string
    phase: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  paymentMethod?: string
  paymentDate?: string
  notes?: string
  downloadUrl?: string
}

interface ClientInvoicesViewProps {
  clientId: string
}

export default function ClientInvoicesView({ clientId }: ClientInvoicesViewProps) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Charger les factures du client
  useEffect(() => {
    loadClientInvoices()
  }, [clientId])

  const loadClientInvoices = () => {
    // Simulation données factures client spécifique
    const clientInvoices: ClientInvoice[] = [
      {
        id: 'inv-001',
        number: 'FAC-2024-001',
        date: '2024-03-15',
        dueDate: '2024-04-15',
        status: 'paid',
        amount: 3186000,
        paidAmount: 3186000,
        description: 'Installation système vidéosurveillance 16 caméras 4K',
        project: {
          id: 'PRJ-001',
          name: 'Sécurisation Siège IT Solutions',
          phase: 'Terminé'
        },
        items: [
          {
            description: 'Installation système vidéosurveillance 16 caméras 4K',
            quantity: 1,
            unitPrice: 2500000,
            total: 2500000
          },
          {
            description: 'Configuration et formation utilisateurs',
            quantity: 8,
            unitPrice: 25000,
            total: 200000
          },
          {
            description: 'Garantie étendue 2 ans',
            quantity: 1,
            unitPrice: 186000,
            total: 186000
          }
        ],
        paymentMethod: 'Virement bancaire',
        paymentDate: '2024-03-20',
        notes: 'Installation réalisée selon cahier des charges. Garantie 2 ans pièces et main d\'œuvre.',
        downloadUrl: '/api/invoices/FAC-2024-001/download'
      },
      {
        id: 'inv-002',
        number: 'FAC-2024-045',
        date: '2024-03-28',
        dueDate: '2024-04-28',
        status: 'sent',
        amount: 850000,
        paidAmount: 0,
        description: 'Maintenance trimestrielle système sécurité',
        project: {
          id: 'PRJ-001',
          name: 'Sécurisation Siège IT Solutions',
          phase: 'Maintenance'
        },
        items: [
          {
            description: 'Maintenance préventive système vidéosurveillance',
            quantity: 1,
            unitPrice: 500000,
            total: 500000
          },
          {
            description: 'Mise à jour firmware et logiciels',
            quantity: 1,
            unitPrice: 150000,
            total: 150000
          },
          {
            description: 'Vérification et nettoyage caméras',
            quantity: 16,
            unitPrice: 12500,
            total: 200000
          }
        ],
        notes: 'Maintenance trimestrielle programmée selon contrat.',
        downloadUrl: '/api/invoices/FAC-2024-045/download'
      },
      {
        id: 'inv-003',
        number: 'FAC-2024-052',
        date: '2024-04-10',
        dueDate: '2024-05-10',
        status: 'sent',
        amount: 1250000,
        paidAmount: 0,
        description: 'Extension système - 8 caméras supplémentaires',
        project: {
          id: 'PRJ-002',
          name: 'Extension Sécurité Annexe',
          phase: 'En cours'
        },
        items: [
          {
            description: 'Caméras IP 4K Hikvision DS-2CD2143G2-I',
            quantity: 8,
            unitPrice: 45000,
            total: 360000
          },
          {
            description: 'Câblage réseau Cat6A',
            quantity: 200,
            unitPrice: 1800,
            total: 360000
          },
          {
            description: 'Installation et configuration',
            quantity: 1,
            unitPrice: 530000,
            total: 530000
          }
        ],
        notes: 'Extension du système existant pour couvrir l\'annexe du bâtiment.',
        downloadUrl: '/api/invoices/FAC-2024-052/download'
      }
    ]
    
    setInvoices(clientInvoices)
  }

  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      const matchesSearch = 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      
      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: ClientInvoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
      case 'paid': return '#10b981'
      case 'overdue': return '#ef4444'
      case 'cancelled': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: ClientInvoice['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon'
      case 'sent': return 'Envoyée'
      case 'paid': return 'Payée'
      case 'overdue': return 'En retard'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  const getStatusIcon = (status: ClientInvoice['status']) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />
      case 'sent': return <Send className="h-4 w-4" />
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'overdue': return <AlertTriangle className="h-4 w-4" />
      case 'cancelled': return <X className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const downloadInvoice = (invoice: ClientInvoice) => {
    // Simulation téléchargement PDF
    const link = document.createElement('a')
    link.href = invoice.downloadUrl || '#'
    link.download = `${invoice.number}.pdf`
    link.click()
    
    // Affichage notification
    alert(`Téléchargement de la facture ${invoice.number} en cours...`)
  }

  const printInvoice = (invoice: ClientInvoice) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = generateInvoiceHTML(invoice)
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const generateInvoiceHTML = (invoice: ClientInvoice) => {
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
            <td class="amount">${formatCurrency(item.total)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr class="total-final">
            <td><strong>TOTAL TTC:</strong></td>
            <td class="amount"><strong>${formatCurrency(invoice.amount)}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div class="notes">
        <h4>📝 Notes:</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>Facture générée le ${new Date().toLocaleDateString('fr-FR')} - Portail Client IT Vision</p>
        <p>🔒 Sécurité • 🏠 Domotique • 🌐 Réseaux • ⚡ Digitalisation</p>
      </div>
    </body>
    </html>
    `
  }

  const getTotalStats = () => {
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
    const pendingAmount = totalAmount - paidAmount
    const paidCount = invoices.filter(inv => inv.status === 'paid').length
    
    return { totalAmount, paidAmount, pendingAmount, paidCount }
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🧾 Mes Factures
            </h2>
            <p className="text-gray-600">
              Consultez et téléchargez vos factures IT Vision
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Dernière mise à jour</div>
            <div className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Facturé</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Payé</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">En Attente</p>
                <p className="text-xl font-bold text-orange-900">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Factures</p>
                <p className="text-xl font-bold text-purple-900">{invoices.length}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et tri */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Numéro, description..."
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
              <option value="sent">En attente</option>
              <option value="paid">Payées</option>
              <option value="overdue">En retard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date</option>
              <option value="amount">Montant</option>
              <option value="status">Statut</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              <span>{sortOrder === 'desc' ? 'Décroissant' : 'Croissant'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des factures */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Factures ({filteredAndSortedInvoices.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAndSortedInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {invoice.number}
                    </h4>
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
                  </div>

                  <p className="text-gray-600 mb-2">{invoice.description}</p>

                  {invoice.project && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {invoice.project.name}
                        </span>
                        <span className="text-xs text-blue-600">
                          ({invoice.project.phase})
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Émise le {new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {invoice.paymentDate && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Payée le {new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right ml-6">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(invoice.amount)}
                  </div>
                  
                  {invoice.status === 'paid' && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Payée intégralement
                    </div>
                  )}
                  
                  {invoice.status === 'sent' && (
                    <div className="text-sm text-orange-600 font-medium">
                      En attente de paiement
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadInvoice(invoice)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Télécharger PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        printInvoice(invoice)
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Imprimer"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedInvoice(invoice)
                      }}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAndSortedInvoices.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune facture trouvée
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucune facture ne correspond aux critères de recherche.'
                : 'Vos factures apparaîtront ici une fois émises.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal détail facture */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <InvoiceDetailModal
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onDownload={() => downloadInvoice(selectedInvoice)}
              onPrint={() => printInvoice(selectedInvoice)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Composant modal détail facture
function InvoiceDetailModal({ 
  invoice, 
  onClose, 
  onDownload, 
  onPrint 
}: {
  invoice: ClientInvoice
  onClose: () => void
  onDownload: () => void
  onPrint: () => void
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const getStatusColor = (status: ClientInvoice['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'sent': return '#3b82f6'
      case 'paid': return '#10b981'
      case 'overdue': return '#ef4444'
      case 'cancelled': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: ClientInvoice['status']) => {
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
            onClick={onDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Télécharger PDF</span>
          </button>
          
          <button
            onClick={onPrint}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer</span>
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
              <div className="mt-2 text-sm text-blue-100">
                <div>📍 Dakar, Sénégal</div>
                <div>📞 +221 77 413 34 40</div>
                <div>✉️ contact@itvision.sn</div>
              </div>
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

        {/* Informations facture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">📅 Informations</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date d'émission:</span>
                <span className="font-medium">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date d'échéance:</span>
                <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
              {invoice.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de paiement:</span>
                  <span className="font-medium text-green-600">{new Date(invoice.paymentDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              {invoice.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode de paiement:</span>
                  <span className="font-medium">{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {invoice.project && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">🚧 Projet Associé</h4>
              <div className="text-blue-800">
                <div className="font-medium">{invoice.project.name}</div>
                <div className="text-sm">Phase: {invoice.project.phase}</div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">📋 Description</h4>
          <p className="text-gray-700">{invoice.description}</p>
        </div>

        {/* Détail articles */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">📦 Détail des Articles</h4>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Quantité</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Prix Unitaire</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-green-800">
              TOTAL: {formatCurrency(invoice.amount)}
            </div>
            {invoice.status === 'paid' && (
              <div className="text-green-600 font-medium mt-2">
                ✓ Facture payée intégralement
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📝 Notes</h4>
            <p className="text-blue-800">{invoice.notes}</p>
          </div>
        )}

        {/* Support */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💬 Support</h4>
          <p className="text-sm text-gray-700">
            Pour toute question concernant cette facture, contactez-nous :
          </p>
          <div className="mt-2 text-sm text-gray-600">
            <div>📞 +221 77 413 34 40</div>
            <div>✉️ facturation@itvision.sn</div>
          </div>
        </div>
      </div>
    </div>
  )
}