'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, UserPlus, Loader2, Mail, Trash2, Clock, ShieldCheck } from 'lucide-react'
import { CARD, INPUT, BTN_PRIMARY, Pill, TONE } from '@/components/portal-ui'

type Member = {
  id: string
  name: string
  email: string
  companyRole: string
  pending: boolean
  isSelf: boolean
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  finance: 'Finance',
  technical: 'Technique',
  viewer: 'Lecture seule',
}
const ROLE_TONE: Record<string, string> = {
  owner: TONE.emerald,
  admin: TONE.sky,
  finance: TONE.amber,
  technical: TONE.teal,
  viewer: TONE.neutral,
}

export default function TeamSection() {
  const [members, setMembers] = useState<Member[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', companyRole: 'viewer' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-enterprise/team')
      if (res.ok) {
        const d = await res.json()
        setMembers(d.members || [])
        setCanManage(!!d.canManage)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/client-enterprise/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setMsg({ type: 'ok', text: `Invitation envoyée à ${form.email}` })
      setForm({ name: '', email: '', companyRole: 'viewer' })
      load()
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function update(memberId: string, action: 'role' | 'remove', companyRole?: string) {
    try {
      const res = await fetch('/api/client-enterprise/team', {
        method: action === 'remove' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, companyRole }),
      })
      if (res.ok) load()
      else setMsg({ type: 'err', text: (await res.json()).error || 'Erreur' })
    } catch {
      setMsg({ type: 'err', text: 'Erreur réseau' })
    }
  }

  if (loading) return <div className={`${CARD} p-6 flex justify-center`}><Loader2 className="w-5 h-5 animate-spin text-stone-300" /></div>

  return (
    <div className="space-y-4">
      {/* Invitation */}
      {canManage && (
        <div className={`${CARD} p-5`}>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-emerald-700" /> Inviter un collaborateur
          </h3>
          <form onSubmit={invite} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Nom</label>
              <input className={INPUT} placeholder="Prénom Nom" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Email *</label>
              <input className={INPUT} type="email" required placeholder="prenom@entreprise.sn" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Rôle</label>
              <select className={INPUT} value={form.companyRole}
                onChange={e => setForm(f => ({ ...f, companyRole: e.target.value }))}>
                {(['admin', 'finance', 'technical', 'viewer'] as const).map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Inviter
            </button>
          </form>
          {msg && (
            <p className={`mt-3 text-xs font-medium ${msg.type === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
          )}
          <p className="mt-3 text-[11px] text-stone-400">L'invité reçoit un email d'activation valable 72 h pour définir son mot de passe.</p>
        </div>
      )}

      {/* Membres */}
      <div className={CARD}>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-900">Membres de l'équipe</h3>
          <span className="ml-auto text-xs text-stone-400 tabular-nums">{members.length}</span>
        </div>
        <ul className="divide-y divide-stone-100">
          {members.map(m => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-50 font-bold text-xs flex-shrink-0">
                {m.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 truncate">
                  {m.name} {m.isSelf && <span className="text-[11px] font-normal text-stone-400">(vous)</span>}
                </p>
                <p className="text-xs text-stone-400 truncate">{m.email}</p>
              </div>
              {m.pending && (
                <Pill color={TONE.amber}><Clock className="w-3 h-3" /> Invitation en attente</Pill>
              )}
              {canManage && !m.isSelf && !m.pending ? (
                <select
                  value={m.companyRole}
                  onChange={e => update(m.id, 'role', e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600"
                >
                  {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              ) : (
                <Pill color={ROLE_TONE[m.companyRole] || TONE.neutral}>
                  {m.companyRole === 'owner' && <ShieldCheck className="w-3 h-3" />}
                  {ROLE_LABEL[m.companyRole] || m.companyRole}
                </Pill>
              )}
              {canManage && !m.isSelf && (
                <button type="button" onClick={() => update(m.id, 'remove')} title="Retirer de l'équipe"
                  className="p-1.5 rounded-lg text-stone-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
