'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Share2, Eye, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'

interface ChannelStats { views: number; reshares: number; joins: number; joinQty: number }
interface FunnelRow {
  groupId: string
  name: string
  status: string
  channels: Record<string, ChannelStats>
  total: ChannelStats
}

const CHANNEL_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  wa: 'WhatsApp',
  status: 'Statut WA',
  social: 'Réseaux',
  direct: 'Direct',
  organic: 'Organique',
}
const channelLabel = (v: string) => CHANNEL_LABELS[v] || v

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '—')

/**
 * Panneau du funnel viral des achats groupés : vues → re-partages → participants,
 * ventilé par canal. Répond à la question « quelle vidéo / quel canal convertit ? ».
 */
export default function GroupFunnelPanel() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ groups: FunnelRow[]; byChannel: Record<string, ChannelStats> } | null>(null)

  useEffect(() => {
    if (!open || data) return
    fetch('/api/admin/group-orders/funnel?days=30')
      .then((r) => r.json())
      .then((d) => { if (d?.success) setData(d) })
      .catch(() => {})
  }, [open, data])

  const channels = data ? Object.entries(data.byChannel).sort((a, b) => b[1].joins - a[1].joins || b[1].views - a[1].views) : []

  return (
    <div className="mb-6 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
        <span className="flex items-center gap-2 font-bold text-slate-800">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          Funnel viral — vues, partages, participants par canal (30 j)
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          {!data ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune mesure pour l'instant — les données arrivent dès les premiers partages de liens <code>?via=…</code>.</p>
          ) : (
            <>
              {/* Synthèse par canal */}
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {channels.map(([via, c]) => (
                  <div key={via} className="rounded-lg bg-violet-50 p-3 ring-1 ring-violet-100">
                    <p className="text-sm font-bold text-violet-800">{channelLabel(via)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><Eye className="h-3 w-3" />{c.views} vues</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600"><Share2 className="h-3 w-3" />{c.reshares} partages</p>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"><UserPlus className="h-3 w-3" />{c.joins} participants ({c.joinQty} pièces)</p>
                    <p className="mt-1 text-xs font-bold text-emerald-700">conversion {pct(c.joins, c.views)}</p>
                  </div>
                ))}
              </div>

              {/* Détail par groupe */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1.5 pr-3 font-semibold">Groupe</th>
                      <th className="py-1.5 pr-3 font-semibold">Canal</th>
                      <th className="py-1.5 pr-3 text-right font-semibold">Vues</th>
                      <th className="py-1.5 pr-3 text-right font-semibold">Partages</th>
                      <th className="py-1.5 pr-3 text-right font-semibold">Participants</th>
                      <th className="py-1.5 text-right font-semibold">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groups.filter((g) => g.total.views + g.total.joins > 0).slice(0, 15).flatMap((g) =>
                      (Object.entries(g.channels) as [string, ChannelStats][])
                        .sort((a, b) => b[1].joins - a[1].joins || b[1].views - a[1].views)
                        .map(([via, c], i) => (
                          <tr key={`${g.groupId}-${via}`} className="border-b border-slate-50">
                            {i === 0 && <td className="py-1.5 pr-3 font-semibold text-slate-700" rowSpan={Object.keys(g.channels).length}>{g.name.slice(0, 40)}</td>}
                            <td className="py-1.5 pr-3 text-slate-600">{channelLabel(via)}</td>
                            <td className="py-1.5 pr-3 text-right text-slate-600">{c.views}</td>
                            <td className="py-1.5 pr-3 text-right text-slate-600">{c.reshares}</td>
                            <td className="py-1.5 pr-3 text-right font-semibold text-slate-800">{c.joins}</td>
                            <td className="py-1.5 text-right font-semibold text-emerald-700">{pct(c.joins, c.views)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
