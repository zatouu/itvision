'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { invoiceStatus, quoteStatus, statusDef } from '@/components/portal-ui'

type ExportType = 'invoices' | 'quotes'
type ExportFormat = 'csv' | 'pdf'

const STATUS_MAPS = { invoices: invoiceStatus, quotes: quoteStatus } as const

function csvCell(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function FinanceExport({ companyName }: { companyName?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const fmtD = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

  async function doExport(type: ExportType, format: ExportFormat) {
    setBusy(format)
    setError('')
    try {
      const res = await fetch(`/api/client-enterprise/export?type=${type}`)
      if (!res.ok) throw new Error()
      const { rows } = await res.json() as { rows: any[] }
      const map = STATUS_MAPS[type]
      const stamp = new Date().toISOString().slice(0, 10)
      const base = `${type === 'invoices' ? 'factures' : 'devis'}-itvision-${stamp}`

      const head = type === 'invoices'
        ? ['N°', 'Date', 'Échéance', 'Statut', 'Montant (FCFA)', 'Payée le', 'Moyen de paiement']
        : ['N°', 'Date', 'Objet', 'Statut', 'Montant (FCFA)']
      const body = (rows || []).map((r: any) => type === 'invoices'
        ? [r.numero, fmtD(r.date), fmtD(r.dueDate), statusDef(map, r.status).label, r.total ?? 0, fmtD(r.paidAt), r.paymentMethod || '']
        : [r.numero, fmtD(r.date), r.title || '', statusDef(map, r.status).label, r.total ?? 0]
      )

      if (format === 'csv') {
        const csv = '\uFEFF' + [head, ...body].map(r => r.map(csvCell).join(';')).join('\r\n')
        download(`${base}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      } else {
        const { default: jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text(`${type === 'invoices' ? 'Factures' : 'Devis'} — ${companyName || 'IT Vision'}`, 14, 16)
        doc.setFontSize(9)
        doc.setTextColor(120)
        doc.text(`Export du ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} ligne${rows.length > 1 ? 's' : ''}`, 14, 22)
        autoTable(doc, {
          startY: 26,
          head: [head],
          body: body.map(r => r.map(v => String(v))),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [6, 78, 59] },
        })
        doc.save(`${base}.pdf`)
      }
      setOpen(false)
    } catch {
      setError("Export impossible — réessayez")
    } finally {
      setBusy(null)
    }
  }

  const options: { label: string; type: ExportType; format: ExportFormat; icon: typeof FileSpreadsheet }[] = [
    { label: 'Factures · CSV', type: 'invoices', format: 'csv', icon: FileSpreadsheet },
    { label: 'Factures · PDF', type: 'invoices', format: 'pdf', icon: FileText },
    { label: 'Devis · CSV', type: 'quotes', format: 'csv', icon: FileSpreadsheet },
    { label: 'Devis · PDF', type: 'quotes', format: 'pdf', icon: FileText },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-400 hover:text-emerald-800"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Exporter
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {options.map(o => (
            <button
              key={o.label}
              type="button"
              disabled={busy !== null}
              onClick={() => doExport(o.type, o.format)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-50"
            >
              <o.icon className="w-4 h-4 text-stone-400" />
              {o.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute right-0 mt-2 w-52 text-xs text-red-600">{error}</p>}
    </div>
  )
}
