'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
} from 'lucide-react'
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (checked: boolean) => void; id?: string }) {
  return (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
    </label>
  )
}

interface AutoImportConfig {
  enabled: boolean
  schedule: string
  urls: string[]
  concurrency: number
  dryRun: boolean
  apiBaseUrl?: string
  apiToken?: string
  lastRun?: {
    startedAt: string
    finishedAt: string
    created: number
    failed: number
    urls: number
    errors?: string[]
  }
}

export default function AutoImportAdminPage() {
  const [config, setConfig] = useState<AutoImportConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [urlsText, setUrlsText] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auto-import', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
        setUrlsText(data.config.urls.join('\n'))
      } else {
        setMessage({ type: 'error', text: data.error || 'Impossible de charger la configuration' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur réseau lors du chargement' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    const urls = urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)
      .filter(u => u.includes('1688.com') || u.includes('aliexpress.com'))

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/auto-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...config,
          urls,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        setUrlsText(data.config.urls.join('\n'))
        setMessage({ type: 'success', text: 'Configuration sauvegardée' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur réseau lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const downloadUrlsFile = () => {
    const blob = new Blob([urlsText || '# Aucune URL configurée\n'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'auto-scrape-urls.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (value?: string) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('fr-FR')
    } catch {
      return value
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Import automatique</h1>
          <p className="text-stone-500 text-sm mt-1">
            Configuration du scraping automatique 1688 / AliExpress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/zatouu/itvision/actions/workflows/auto-import.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub Actions
          </a>
          <button
            onClick={downloadUrlsFile}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white text-stone-700 px-4 py-2 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            auto-scrape-urls.txt
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Settings className="h-5 w-5 text-emerald-700" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900">Paramètres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Activé</label>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={config?.enabled || false}
                  onChange={(checked) =>
                    setConfig(prev => (prev ? { ...prev, enabled: checked } : prev))
                  }
                  id="auto-import-enabled"
                />
                <span className="text-sm text-stone-600">
                  {config?.enabled ? 'Le cron est actif' : 'Le cron est désactivé'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Schedule (cron)</label>
              <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 bg-stone-50">
                <Clock className="h-4 w-4 text-stone-500" />
                <input
                  type="text"
                  value={config?.schedule || '0 2 * * *'}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, schedule: e.target.value } : prev)}
                  className="bg-transparent border-none outline-none text-sm w-full text-stone-900"
                  placeholder="0 2 * * *"
                />
              </div>
              <p className="text-xs text-stone-500 mt-1">Le cron est exécuté par GitHub Actions. Heure UTC.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Concurrence</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config?.concurrency || 1}
                onChange={(e) =>
                  setConfig(prev =>
                    prev ? { ...prev, concurrency: Math.min(10, Math.max(1, Number(e.target.value) || 1)) } : prev
                  )
                }
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Mode dry-run</label>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={config?.dryRun || false}
                  onChange={(checked) =>
                    setConfig(prev => (prev ? { ...prev, dryRun: checked } : prev))
                  }
                  id="auto-import-dry-run"
                />
                <span className="text-sm text-stone-600">
                  {config?.dryRun ? 'Scraper sans importer' : 'Importer réellement'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">URL API (optionnel)</label>
              <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2">
                <Globe className="h-4 w-4 text-stone-500" />
                <input
                  type="url"
                  value={config?.apiBaseUrl || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, apiBaseUrl: e.target.value } : prev)}
                  className="bg-transparent border-none outline-none text-sm w-full text-stone-900"
                  placeholder="https://app.itvision.sn"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Token API (optionnel)</label>
              <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2">
                <ShieldAlert className="h-4 w-4 text-stone-500" />
                <input
                  type="password"
                  value={config?.apiToken || ''}
                  onChange={(e) => setConfig(prev => prev ? { ...prev, apiToken: e.target.value } : prev)}
                  className="bg-transparent border-none outline-none text-sm w-full text-stone-900"
                  placeholder="JWT admin"
                />
              </div>
              <p className="text-xs text-stone-500 mt-1">Laisser vide pour générer un token auto depuis JWT_SECRET.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              URLs à scraper
            </label>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={12}
              placeholder={"# Une URL par ligne\nhttps://www.aliexpress.com/item/33012345678.html\nhttps://detail.1688.com/offer/1234567890.html"}
              className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
            />
            <p className="text-xs text-stone-500 mt-2">
              {urlsText.split('\n').filter(u => u.trim() && (u.includes('1688.com') || u.includes('aliexpress.com'))).length} URL(s) valide(s)
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-stone-100">
            <button
              type="button"
              onClick={loadConfig}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white text-stone-700 px-4 py-2 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recharger
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {config?.lastRun && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-700" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">Dernier rapport</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-500 mb-1">Démarré</p>
                <p className="text-sm font-medium text-stone-900">{formatDate(config.lastRun.startedAt)}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-500 mb-1">Terminé</p>
                <p className="text-sm font-medium text-stone-900">{formatDate(config.lastRun.finishedAt)}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-500 mb-1">URLs</p>
                <p className="text-sm font-medium text-stone-900">{config.lastRun.urls}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs text-emerald-600 mb-1">Créés</p>
                <p className="text-2xl font-bold text-emerald-700">{config.lastRun.created}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-red-600 mb-1">Échecs</p>
                <p className="text-2xl font-bold text-red-700">{config.lastRun.failed}</p>
              </div>
              {config.lastRun.errors && config.lastRun.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 sm:col-span-3">
                  <p className="text-xs text-red-600 mb-2">Erreurs</p>
                  <ul className="text-xs text-red-800 space-y-1 list-disc pl-4">
                    {config.lastRun.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
