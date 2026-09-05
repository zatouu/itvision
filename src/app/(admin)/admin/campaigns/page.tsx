'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Mail, Plus, Send, Trash2, Eye, X, Loader2, CheckCircle, AlertCircle,
  Users, Clock, BarChart3
} from 'lucide-react'

interface Campaign {
  _id: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  sector?: string
  city?: string
  status: string
  sentCount: number
  failedCount: number
  sentAt?: string
  createdAt: string
}

interface Template {
  sector: string
  label: string
  subject: string
  html: string
  text: string
}

const SECTORS: Record<string, string> = {
  immobilier: 'Immobilier',
  banque_finance: 'Banque & Finance',
  commerce_detail: 'Commerce de détail',
  hotellerie: 'Hôtellerie',
  sante: 'Santé',
  education: 'Éducation',
  industrie: 'Industrie',
  logistique: 'Logistique',
  administration: 'Administration',
  btp: 'BTP',
  restauration: 'Restauration',
  autre: 'Général',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sending: 'Envoi...',
  sent: 'Envoyée',
  scheduled: 'Planifiée',
  cancelled: 'Annulée',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [targetCount, setTargetCount] = useState<number | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaigns?limit=50')
      const data = await res.json()
      if (res.ok) setCampaigns(data.campaigns || [])
    } catch {} finally { setLoading(false) }
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/campaigns/templates')
      const data = await res.json()
      if (res.ok) setTemplates(data.templates || [])
    } catch {}
  }

  useEffect(() => { fetchCampaigns(); fetchTemplates() }, [fetchCampaigns])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    try {
      await fetch(`/api/admin/campaigns?id=${id}`, { method: 'DELETE' })
      fetchCampaigns()
    } catch {}
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Mail className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Campagnes email</h1>
            <p className="text-sm text-stone-500">
              Créez et envoyez des campagnes de prospection ciblées par secteur.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <a href="/admin/prospects" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm text-stone-700">
            <Users className="w-4 h-4" /> Gérer les prospects
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-700 font-medium">
              <tr>
                <th className="px-4 py-3">Campagne</th>
                <th className="px-4 py-3">Secteur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Envois</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Chargement...
                </td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  Aucune campagne. Cliquez sur "Nouvelle campagne" pour commencer.
                </td></tr>
              ) : campaigns.map(c => (
                <tr key={c._id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{c.name}</p>
                    <p className="text-xs text-stone-400">{c.subject}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{c.sector ? SECTORS[c.sector] || c.sector : 'Tous'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-stone-100'}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-700 font-medium">{c.sentCount} envoyés</span>
                      {c.failedCount > 0 && <span className="text-red-500">{c.failedCount} échecs</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {c.sentAt ? new Date(c.sentAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPreviewCampaign(c)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500" title="Aperçu">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateCampaignModal
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchCampaigns() }}
        />
      )}

      {previewCampaign && (
        <PreviewModal campaign={previewCampaign} onClose={() => setPreviewCampaign(null)} />
      )}
    </div>
  )
}

function CreateCampaignModal({ templates, onClose, onCreated }: { templates: Template[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [sending, setSending] = useState(false)
  const [targetCount, setTargetCount] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const applyTemplate = (templateSector: string) => {
    const tpl = templates.find(t => t.sector === templateSector)
    if (!tpl) return
    setSector(templateSector)
    setSubject(tpl.subject)
    setHtmlContent(tpl.html)
    setTextContent(tpl.text)
    if (!name) setName(`Campagne ${tpl.label}`)
  }

  useEffect(() => {
    if (templates.length > 0 && !htmlContent) {
      applyTemplate('autre')
    }
  }, [templates])

  const estimateTargets = async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '1')
      if (sector) params.set('sector', sector)
      if (city) params.set('city', city)
      params.set('status', 'new')
      const res = await fetch(`/api/admin/leads?${params.toString()}`)
      const data = await res.json()
      setTargetCount(data.pagination?.total || 0)
    } catch {}
  }

  useEffect(() => { if (sector || city) estimateTargets() }, [sector, city])

  const handleSend = async (action: 'draft' | 'send') => {
    if (!name || !subject || !htmlContent) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, htmlContent, textContent, sector, city, action }),
      })
      const data = await res.json()
      if (res.ok) {
        if (action === 'send') {
          alert(`Campagne envoyée vers ${data.campaign?.leadIds?.length || 0} prospect(s)`)
        }
        onCreated()
      } else {
        alert(data.error || 'Erreur')
      }
    } catch {
      alert('Erreur lors de la création')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-stone-900">Nouvelle campagne</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Template par secteur</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {templates.map(tpl => (
                <button
                  key={tpl.sector}
                  onClick={() => applyTemplate(tpl.sector)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    sector === tpl.sector
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-stone-700">Nom de la campagne</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Sujet</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Filtrer par ville (optionnel)</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Dakar"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Cible estimée</label>
              <div className="px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm mt-1 text-stone-600">
                {targetCount !== null ? `${targetCount} prospect(s)` : 'Sélectionnez un secteur'}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-stone-700">Contenu HTML</label>
              <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-blue-600 hover:underline">
                {showPreview ? 'Éditer' : 'Aperçu'}
              </button>
            </div>
            {showPreview ? (
              <div className="border border-stone-300 rounded-lg p-3 max-h-96 overflow-y-auto bg-white" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            ) : (
              <textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)}
                rows={12} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono mt-1" />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">Version texte (optionnel)</label>
            <textarea value={textContent} onChange={e => setTextContent(e.target.value)}
              rows={4} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono mt-1" />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <p className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Variables disponibles: <code className="text-xs">{'{{companyName}}'}</code>, <code className="text-xs">{'{{contactName}}'}</code>, <code className="text-xs">{'{{siteUrl}}'}</code>, <code className="text-xs">{'{{whatsapp}}'}</code>, <code className="text-xs">{'{{contactEmail}}'}</code>
            </p>
          </div>
        </div>
        <div className="p-5 border-t border-stone-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm">Annuler</button>
          <button
            onClick={() => handleSend('draft')}
            disabled={sending || !name || !subject || !htmlContent}
            className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm font-medium disabled:opacity-50"
          >
            Sauver brouillon
          </button>
          <button
            onClick={() => handleSend('send')}
            disabled={sending || !name || !subject || !htmlContent}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer maintenant
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-stone-900">Aperçu: {campaign.name}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-4 text-sm text-stone-500">
            <span><strong>Sujet:</strong> {campaign.subject}</span>
            <span><strong>Envois:</strong> {campaign.sentCount}</span>
            {campaign.failedCount > 0 && <span className="text-red-500"><strong>Échecs:</strong> {campaign.failedCount}</span>}
          </div>
          <div className="border border-stone-200 rounded-lg p-4 bg-stone-50" dangerouslySetInnerHTML={{ __html: campaign.htmlContent }} />
        </div>
      </div>
    </div>
  )
}
