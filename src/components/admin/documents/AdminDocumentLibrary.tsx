'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Download, ExternalLink, Eye, EyeOff, FileSpreadsheet, FileText, FolderKanban, Image as ImageIcon,
  LayoutGrid, List, Loader2, Receipt, Search, Trash2, UploadCloud, X, File as FileIcon,
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import FileDropZone from '@/components/ui/FileDropZone'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'
import { DOCUMENT_ACCEPT, uploadFile } from '@/lib/http/upload-file'

type Source = 'project' | 'quote' | 'invoice'
type Kind = 'pdf' | 'image' | 'office' | 'other'

interface LibraryDocument {
  key: string
  docId: string
  source: Source
  parentId: string
  parentLabel: string
  projectId?: string
  projectName?: string
  clientName?: string
  name: string
  url: string
  kind: Kind
  category: string
  size?: number
  date?: string
  clientVisible?: boolean
}

interface Stats { total: number; bySource: Record<Source, number>; byKind: Record<Kind, number>; sharedWithClients: number }
interface TargetOption { id: string; label: string }

const SOURCE_META: Record<Source, { label: string; icon: any; cls: string }> = {
  project: { label: 'Projet', icon: FolderKanban, cls: 'bg-emerald-50 text-emerald-700' },
  quote: { label: 'Devis', icon: FileText, cls: 'bg-blue-50 text-blue-700' },
  invoice: { label: 'Facture', icon: Receipt, cls: 'bg-amber-50 text-amber-700' },
}

const CATEGORY_LABELS: Record<string, string> = {
  quote: 'Devis / BC', contract: 'Contrat', invoice: 'Facture', technical: 'Technique', photo: 'Photo', manual: 'Manuel',
  bon_commande: 'Bon de commande', recu: 'Reçu', contrat: 'Contrat', cheque: 'Chèque', autre: 'Autre',
}

const PROJECT_CATEGORIES = ['technical', 'contract', 'quote', 'invoice', 'photo', 'manual']
const ATTACHMENT_CATEGORIES = ['bon_commande', 'recu', 'contrat', 'cheque', 'autre']

const fmtSize = (n?: number) => (!n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

function KindIcon({ kind, className = 'h-5 w-5' }: { kind: Kind; className?: string }) {
  if (kind === 'pdf') return <FileText className={`${className} text-red-500`} />
  if (kind === 'image') return <ImageIcon className={`${className} text-violet-500`} />
  if (kind === 'office') return <FileSpreadsheet className={`${className} text-emerald-600`} />
  return <FileIcon className={`${className} text-stone-400`} />
}

function parentHref(d: LibraryDocument) {
  if (d.source === 'project') return `/admin/projects/${d.parentId}`
  const numero = d.parentLabel.replace(/^(Devis|Facture)\s+/, '').split(' — ')[0]
  return d.source === 'quote' ? `/admin/devis?search=${encodeURIComponent(numero)}` : `/admin/factures?search=${encodeURIComponent(numero)}`
}

export default function AdminDocumentLibrary() {
  const toast = useToastContext()
  const [docs, setDocs] = useState<LibraryDocument[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [source, setSource] = useState<'all' | Source>('all')
  const [kind, setKind] = useState<'all' | Kind>('all')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [preview, setPreview] = useState<LibraryDocument | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Dépôt : fichiers en attente de classement dans un dossier
  const [staged, setStaged] = useState<File[]>([])
  const [targetType, setTargetType] = useState<Source>('project')
  const [targets, setTargets] = useState<Record<Source, TargetOption[] | null>>({ project: null, quote: null, invoice: null })
  const [targetId, setTargetId] = useState('')
  const [targetSearch, setTargetSearch] = useState('')
  const [category, setCategory] = useState('technical')
  const [shareWithClient, setShareWithClient] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => { setPage(1) }, [debounced, source, kind])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '24' })
      if (debounced) params.set('q', debounced)
      if (source !== 'all') params.set('source', source)
      if (kind !== 'all') params.set('kind', kind)
      const res = await fetch(`/api/admin/documents?${params}`, { credentials: 'include', cache: 'no-store' })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data))
      setDocs(data.documents || [])
      setStats(data.stats || null)
      setPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e: any) {
      toast.error(e?.message || 'Chargement des documents impossible')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debounced, source, kind])

  useEffect(() => { load() }, [load])

  const loadTargets = useCallback(async (type: Source) => {
    if (targets[type]) return
    try {
      const url = type === 'project' ? '/api/projects?status=all&limit=300' : type === 'quote' ? '/api/admin/quotes' : '/api/admin/invoices'
      const res = await fetch(url, { credentials: 'include' })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data))
      const list: TargetOption[] = type === 'project'
        ? (data.projects || []).map((p: any) => ({ id: String(p._id || p.id), label: `${p.name}${p.clientSnapshot?.company ? ` — ${p.clientSnapshot.company}` : ''}` }))
        : type === 'quote'
          ? (data.quotes || []).filter((q: any) => q.status !== 'superseded').map((q: any) => ({ id: String(q._id || q.id), label: `${q.numero}${q.title ? ` — ${q.title}` : ''}${q.client?.name ? ` (${q.client.name})` : ''}` }))
          : (data.invoices || []).filter((i: any) => i.status !== 'cancelled').map((i: any) => ({ id: String(i._id || i.id), label: `${i.number || i.numero}${i.client?.name ? ` — ${i.client.name}` : ''}` }))
      setTargets(prev => ({ ...prev, [type]: list }))
    } catch (e: any) {
      toast.error(e?.message || 'Liste des dossiers indisponible')
      setTargets(prev => ({ ...prev, [type]: [] }))
    }
  }, [targets, toast])

  useEffect(() => {
    if (staged.length) loadTargets(targetType)
  }, [staged.length, targetType, loadTargets])

  const onStage = (files: File[]) => {
    setStaged(prev => [...prev, ...files].slice(0, 20))
    setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  const changeTargetType = (t: Source) => {
    setTargetType(t)
    setTargetId('')
    setTargetSearch('')
    setCategory(t === 'project' ? 'technical' : 'autre')
  }

  const filteredTargets = useMemo(() => {
    const list = targets[targetType] || []
    const q = targetSearch.trim().toLowerCase()
    return (q ? list.filter(t => t.label.toLowerCase().includes(q)) : list).slice(0, 200)
  }, [targets, targetType, targetSearch])

  const classify = async () => {
    if (!targetId || !staged.length) return
    setUploading(true)
    let done = 0
    try {
      for (const file of staged) {
        const uploaded = await uploadFile(file, { endpoint: '/api/admin/documents/upload', fields: { category } })
        const res = await fetch('/api/admin/documents', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: targetType,
            targetId,
            category,
            clientVisible: targetType === 'project' && shareWithClient,
            file: { name: targetType === 'project' ? file.name.replace(/\.[^.]+$/, '') || file.name : file.name, url: uploaded.url, type: file.type, size: file.size },
          }),
        })
        const data = await readJsonResponse(res)
        if (!res.ok) throw new Error(apiErrorMessage(res, data, `Classement de ${file.name} impossible`))
        done++
      }
      toast.success(done > 1 ? `${done} documents classés` : 'Document classé')
      setStaged([])
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Envoi impossible')
      setStaged(prev => prev.slice(done))
      if (done) await load()
    } finally {
      setUploading(false)
    }
  }

  const toggleShare = async (d: LibraryDocument) => {
    setBusyKey(d.key)
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'project', parentId: d.parentId, docId: d.docId, clientVisible: !d.clientVisible }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data))
      setDocs(prev => prev.map(x => (x.key === d.key ? { ...x, clientVisible: !d.clientVisible } : x)))
      toast.success(!d.clientVisible ? 'Visible par le client (notifié)' : 'Masqué au client')
    } catch (e: any) {
      toast.error(e?.message || 'Modification impossible')
    } finally {
      setBusyKey(null)
    }
  }

  const remove = async (d: LibraryDocument) => {
    if (!confirm(`Retirer « ${d.name} » de ${d.parentLabel} ?`)) return
    setBusyKey(d.key)
    try {
      const params = new URLSearchParams({ source: d.source, parentId: d.parentId, docId: d.docId })
      const res = await fetch(`/api/admin/documents?${params}`, { method: 'DELETE', credentials: 'include' })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data))
      toast.success('Document retiré')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Suppression impossible')
    } finally {
      setBusyKey(null)
    }
  }

  const actions = (d: LibraryDocument, compact = false) => (
    <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      {(d.kind === 'pdf' || d.kind === 'image') && (
        <button type="button" onClick={() => setPreview(d)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-blue-600" aria-label={`Aperçu de ${d.name}`}><Eye className="h-4 w-4" /></button>
      )}
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label={`Ouvrir ${d.name}`}><ExternalLink className="h-4 w-4" /></a>
      <a href={d.url} download className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label={`Télécharger ${d.name}`}><Download className="h-4 w-4" /></a>
      <button type="button" onClick={() => remove(d)} disabled={busyKey === d.key} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Retirer ${d.name}`}><Trash2 className="h-4 w-4" /></button>
    </div>
  )

  const shareBadge = (d: LibraryDocument) => d.source === 'project' ? (
    <button type="button" onClick={() => toggleShare(d)} disabled={busyKey === d.key}
      title="Basculer la visibilité sur le portail client"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.clientVisible ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-stone-100 text-stone-500'}`}>
      {d.clientVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{d.clientVisible ? 'Client' : 'Interne'}
    </button>
  ) : null

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Documents</h1>
          <p className="text-sm text-stone-600">Toutes les pièces des projets, devis et factures, au même endroit.</p>
        </div>
        {stats && (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Documents', value: stats.total },
              { label: 'Projets', value: stats.bySource.project },
              { label: 'Devis / factures', value: stats.bySource.quote + stats.bySource.invoice },
              { label: 'Partagés client', value: stats.sharedWithClients },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-stone-200 bg-white px-3 py-2">
                <dt className="text-[11px] text-stone-500">{s.label}</dt>
                <dd className="text-lg font-bold text-stone-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Dépôt et classement */}
      <div ref={uploadRef} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <FileDropZone
          multiple
          accept={DOCUMENT_ACCEPT}
          maxSizeMb={20}
          onFiles={onStage}
          onError={msg => toast.error(msg)}
          label="Glissez vos documents ici ou cliquez pour parcourir"
          hint="PDF, Word, Excel, images — 20 Mo max par fichier. Vous choisirez ensuite le dossier."
        />
        {staged.length > 0 && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <ul className="flex flex-wrap gap-2">
              {staged.map((f, i) => (
                <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs text-stone-700 ring-1 ring-stone-200">
                  <span className="truncate">{f.name}</span><span className="text-stone-400">{fmtSize(f.size)}</span>
                  <button type="button" onClick={() => setStaged(prev => prev.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="text-stone-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_auto] md:items-end">
              <div>
                <p className="mb-1 text-xs font-medium text-stone-600">Classer dans</p>
                <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
                  {(Object.keys(SOURCE_META) as Source[]).map(s => (
                    <button key={s} type="button" onClick={() => changeTargetType(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${targetType === s ? 'bg-blue-600 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
                      {SOURCE_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="doc-target-search">Dossier</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="doc-target-search" value={targetSearch} onChange={e => setTargetSearch(e.target.value)} placeholder="Filtrer…" className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm sm:w-40" />
                  <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm" aria-label="Dossier cible">
                    <option value="">{targets[targetType] === null ? 'Chargement…' : `Choisir ${targetType === 'project' ? 'un projet' : targetType === 'quote' ? 'un devis' : 'une facture'} (${filteredTargets.length})`}</option>
                    {filteredTargets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-2 text-sm" aria-label="Type de document">
                  {(targetType === 'project' ? PROJECT_CATEGORIES : ATTACHMENT_CATEGORIES).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
                <button type="button" onClick={classify} disabled={!targetId || uploading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Classer {staged.length} fichier{staged.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
            {targetType === 'project' && (
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={shareWithClient} onChange={e => setShareWithClient(e.target.checked)} className="rounded" />
                Partager avec le client sur son portail (il est notifié)
              </label>
            )}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom, projet, client, devis, facture…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm" aria-label="Rechercher un document" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-x-auto rounded-xl border border-stone-200 bg-white p-0.5">
            {([['all', 'Tous'], ['project', 'Projets'], ['quote', 'Devis'], ['invoice', 'Factures']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSource(k)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${source === k ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
                {label}{stats && k !== 'all' ? ` (${stats.bySource[k]})` : ''}
              </button>
            ))}
          </div>
          <select value={kind} onChange={e => setKind(e.target.value as any)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" aria-label="Format">
            <option value="all">Tous formats</option>
            <option value="pdf">PDF</option>
            <option value="image">Images</option>
            <option value="office">Word / Excel</option>
            <option value="other">Autres</option>
          </select>
          <div className="hidden rounded-xl border border-stone-200 bg-white p-0.5 sm:inline-flex">
            <button type="button" onClick={() => setView('grid')} aria-label="Vue grille" className={`rounded-lg p-1.5 ${view === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button type="button" onClick={() => setView('list')} aria-label="Vue liste" className={`rounded-lg p-1.5 ${view === 'list' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-stone-400" /></div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-14 text-center text-stone-500">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p className="text-sm">{debounced || source !== 'all' || kind !== 'all' ? 'Aucun document ne correspond à ces critères.' : 'Aucun document pour l’instant : déposez-en un ci-dessus.'}</p>
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map(d => {
            const meta = SOURCE_META[d.source]
            return (
              <li key={d.key} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <button type="button" onClick={() => (d.kind === 'pdf' || d.kind === 'image' ? setPreview(d) : window.open(d.url, '_blank'))}
                  className="flex h-32 items-center justify-center bg-stone-50" aria-label={`Ouvrir ${d.name}`}>
                  {d.kind === 'image'
                    ? <img src={d.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <KindIcon kind={d.kind} className="h-10 w-10" />}
                </button>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-stone-900" title={d.name}>{d.name}</p>
                  <Link href={parentHref(d)} className={`inline-flex max-w-full items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                    <meta.icon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{d.parentLabel}</span>
                  </Link>
                  {d.source !== 'project' && d.projectName && <p className="truncate text-[11px] text-stone-500">Projet : {d.projectName}</p>}
                  <p className="text-[11px] text-stone-400">{CATEGORY_LABELS[d.category] || d.category} · {fmtDate(d.date)}{d.size ? ` · ${fmtSize(d.size)}` : ''}</p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    {shareBadge(d) || <span />}
                    {actions(d, true)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {docs.map(d => (
            <li key={d.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <KindIcon kind={d.kind} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">{d.name}</p>
                  <p className="truncate text-xs text-stone-500">
                    <Link href={parentHref(d)} className="hover:underline">{d.parentLabel}</Link>
                    {d.clientName ? ` · ${d.clientName}` : ''} · {CATEGORY_LABELS[d.category] || d.category} · {fmtDate(d.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                {shareBadge(d)}
                {actions(d)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-stone-500">{total} document{total > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40">Précédent</button>
            <span className="text-stone-600">{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40">Suivant</button>
          </div>
        </nav>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={() => setPreview(null)} role="dialog" aria-modal="true">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
              <KindIcon kind={preview.kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{preview.name}</p>
                <p className="truncate text-xs text-stone-500">{preview.parentLabel}</p>
              </div>
              <a href={preview.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Ouvrir dans un nouvel onglet"><ExternalLink className="h-4 w-4" /></a>
              <a href={preview.url} download className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Télécharger"><Download className="h-4 w-4" /></a>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 bg-stone-100">
              {preview.kind === 'pdf'
                ? <iframe src={`${preview.url}#toolbar=1&view=FitH`} className="h-full min-h-[70vh] w-full" title={preview.name} />
                : <div className="flex h-full items-center justify-center overflow-auto p-4"><img src={preview.url} alt={preview.name} className="max-h-[80vh] max-w-full object-contain" /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
