'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, UserPlus, Loader2, Mail, Trash2, Clock, ShieldCheck, SlidersHorizontal, X, RotateCw, Check, AlertTriangle } from 'lucide-react'
import { CARD, INPUT, BTN_PRIMARY, Pill, TONE } from '@/components/portal-ui'
import {
  CAPABILITY_GROUPS, ROLE_CAPABILITIES, ROLE_LABEL, ROLE_PRESETS,
  type CompanyCapability, type CompanyRole,
} from '@/lib/company-rights'

type Member = {
  id: string
  name: string
  email: string
  companyRole: CompanyRole
  capabilities: CompanyCapability[]
  custom: boolean
  pending: boolean
  expired: boolean
  isSelf: boolean
}
type Services = { reports: boolean; maintenance: boolean }

const ROLE_TONE: Record<string, string> = {
  owner: TONE.emerald,
  admin: TONE.sky,
  finance: TONE.amber,
  technical: TONE.teal,
  viewer: TONE.neutral,
}

const TOTAL_RIGHTS = CAPABILITY_GROUPS.reduce((n, g) => n + g.items.length, 0)
const countRights = (caps: CompanyCapability[]) => caps.filter(c => c !== 'portal:access').length

/** Cases à cocher des droits, groupées ; les services coupés par IT Vision sont signalés. */
function RightsChecklist({ value, onChange, services, disabled }: {
  value: CompanyCapability[]
  onChange: (caps: CompanyCapability[]) => void
  services: Services
  disabled?: boolean
}) {
  const toggle = (cap: CompanyCapability) =>
    onChange(value.includes(cap) ? value.filter(c => c !== cap) : [...value, cap])
  return (
    <div className="space-y-4">
      {CAPABILITY_GROUPS.map(group => (
        <fieldset key={group.title} disabled={disabled}>
          <legend className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 mb-1.5">{group.title}</legend>
          <div className="space-y-1">
            {group.items.map(item => {
              const off = item.service ? !services[item.service] : false
              return (
                <label key={item.cap} className={`flex items-start gap-3 rounded-lg px-2.5 py-2 ${disabled ? '' : 'cursor-pointer hover:bg-stone-50'}`}>
                  <input type="checkbox" checked={value.includes(item.cap)} onChange={() => toggle(item.cap)}
                    className="mt-0.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600" />
                  <span className="min-w-0">
                    <span className="block text-sm text-stone-800">{item.label}</span>
                    <span className="block text-xs text-stone-400">
                      {item.hint}
                      {off && <span className="text-amber-700"> Service non activé pour votre entreprise : sans effet pour l&apos;instant.</span>}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

/** Choix d'un profil de départ, puis ajustement fin des droits. */
function RoleAndRights({ role, caps, onRole, onCaps, services, allowOwner }: {
  role: CompanyRole
  caps: CompanyCapability[]
  onRole: (r: CompanyRole) => void
  onCaps: (c: CompanyCapability[]) => void
  services: Services
  allowOwner?: boolean
}) {
  const presets = allowOwner
    ? [{ role: 'owner' as CompanyRole, label: 'Propriétaire', description: "Tous les droits. Ne peut être modifié ou retiré que par un propriétaire." }, ...ROLE_PRESETS]
    : ROLE_PRESETS
  const isCustom = role !== 'owner' && [...caps].sort().join() !== [...ROLE_CAPABILITIES[role]].sort().join()
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-stone-600 mb-2">Profil de départ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map(p => {
            const active = role === p.role
            return (
              <button key={p.role} type="button" onClick={() => { onRole(p.role); onCaps(ROLE_CAPABILITIES[p.role]) }} aria-pressed={active}
                className={`text-left rounded-xl border p-3 transition-colors ${active ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-stone-200 hover:border-emerald-300'}`}>
                <span className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">{p.label}</span>
                  {active && <Check className="w-4 h-4 text-emerald-700" />}
                </span>
                <span className="block text-xs text-stone-500 mt-0.5">{p.description}</span>
              </button>
            )
          })}
        </div>
      </div>
      {role === 'owner' ? (
        <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">Un propriétaire dispose de tous les droits.</p>
      ) : (
        <div>
          <p className="text-xs font-medium text-stone-600 mb-2">
            Droits accordés {isCustom && <span className="ml-1 text-emerald-700">(personnalisés)</span>}
          </p>
          <RightsChecklist value={caps} onChange={onCaps} services={services} />
        </div>
      )}
    </div>
  )
}

function RightsDialog({ member, services, allowOwner, onClose, onSaved }: {
  member: Member
  services: Services
  allowOwner: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<CompanyRole>(member.companyRole)
  const [caps, setCaps] = useState<CompanyCapability[]>(member.capabilities)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const custom = role !== 'owner' && [...caps].sort().join() !== [...ROLE_CAPABILITIES[role]].sort().join()
      const res = await fetch('/api/client-enterprise/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, companyRole: role, capabilities: custom ? caps : null }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Modification refusée')
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-950/50 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rights-title" onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="min-w-0">
            <h2 id="rights-title" className="font-bold text-stone-900 truncate">Droits de {member.name}</h2>
            <p className="text-xs text-stone-400 truncate">{member.email}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full text-stone-400 hover:bg-stone-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5">
          <RoleAndRights role={role} caps={caps} onRole={setRole} onCaps={setCaps} services={services} allowOwner={allowOwner} />
        </div>
        <div className="border-t border-stone-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-xs text-stone-400">Prend effet immédiatement, sans reconnexion.</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-sm text-stone-600 hover:bg-stone-100">Annuler</button>
            <button onClick={save} disabled={saving} className={BTN_PRIMARY}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamSection() {
  const [members, setMembers] = useState<Member[]>([])
  const [canManage, setCanManage] = useState(false)
  const [viewerIsOwner, setViewerIsOwner] = useState(false)
  const [services, setServices] = useState<Services>({ reports: true, maintenance: true })
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [inviteRole, setInviteRole] = useState<CompanyRole>('viewer')
  const [inviteCaps, setInviteCaps] = useState<CompanyCapability[]>(ROLE_CAPABILITIES.viewer)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null)
  const [editing, setEditing] = useState<Member | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/client-enterprise/team')
      if (res.ok) {
        const d = await res.json()
        setMembers(d.members || [])
        setCanManage(!!d.canManage)
        setViewerIsOwner(!!d.viewerIsOwner)
        if (d.services) setServices(d.services)
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
      const custom = [...inviteCaps].sort().join() !== [...ROLE_CAPABILITIES[inviteRole]].sort().join()
      const res = await fetch('/api/client-enterprise/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, companyRole: inviteRole, capabilities: custom ? inviteCaps : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Invitation refusée')
      setMsg(d.emailSent === false
        ? { type: 'warn', text: `Compte créé pour ${form.email}, mais l'email d'invitation n'est pas parti. Utilisez « Renvoyer l'invitation ».` }
        : { type: 'ok', text: `Invitation envoyée à ${form.email}. Le lien d'activation est valable 72 h.` })
      setForm({ name: '', email: '' })
      setInviteRole('viewer'); setInviteCaps(ROLE_CAPABILITIES.viewer)
      setInviteOpen(false)
      load()
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function resend(m: Member) {
    setMsg(null)
    const res = await fetch('/api/client-enterprise/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: m.id, action: 'resend' }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg({ type: 'err', text: d.error || 'Renvoi refusé' })
    setMsg(d.emailSent === false
      ? { type: 'warn', text: `Le nouvel email d'invitation pour ${m.email} n'est pas parti. Réessayez plus tard.` }
      : { type: 'ok', text: `Nouvelle invitation envoyée à ${m.email}.` })
    load()
  }

  async function remove(m: Member) {
    const invitation = m.pending || m.expired
    if (!confirm(invitation
      ? `Annuler l'invitation de ${m.email} ?`
      : `Retirer ${m.name} de l'espace ? Cette personne n'aura plus accès aux documents de l'entreprise.`)) return
    setMsg(null)
    const res = await fetch('/api/client-enterprise/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: m.id }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg({ type: 'err', text: d.error || 'Opération refusée' })
    setMsg({ type: 'ok', text: invitation ? 'Invitation annulée.' : `${m.name} a été retiré de l'espace.` })
    load()
  }

  if (loading) return <div className={`${CARD} p-6 flex justify-center`}><Loader2 className="w-5 h-5 animate-spin text-stone-300" /></div>

  const editable = (m: Member) => canManage && !m.isSelf && (m.companyRole !== 'owner' || viewerIsOwner)

  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        <div>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-700" />Équipe et droits</h3>
          <p className="text-xs text-stone-500 mt-1">
            {canManage
              ? "Invitez vos collègues et choisissez ce que chacun peut voir et faire dans l'espace de votre entreprise."
              : "Les personnes de votre entreprise qui ont accès à cet espace. Un administrateur de l'espace gère les invitations et les droits."}
          </p>
        </div>
        {canManage && !inviteOpen && (
          <button type="button" onClick={() => { setInviteOpen(true); setMsg(null) }} className={`${BTN_PRIMARY} self-start sm:self-auto`}>
            <UserPlus className="w-4 h-4" />Inviter un collègue
          </button>
        )}
      </div>

      {msg && (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
          msg.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : msg.type === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {msg.type === 'ok' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}{msg.text}
        </p>
      )}

      {canManage && inviteOpen && (
        <form onSubmit={invite} className={`${CARD} p-5 space-y-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2"><UserPlus className="w-4 h-4 text-emerald-700" />Inviter un collègue</h3>
            <button type="button" onClick={() => setInviteOpen(false)} aria-label="Fermer" className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Nom et prénom</label>
              <input className={INPUT} placeholder="Awa Diop" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Email professionnel *</label>
              <input className={INPUT} type="email" required placeholder="awa.diop@entreprise.sn" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <RoleAndRights role={inviteRole} caps={inviteCaps} onRole={setInviteRole} onCaps={setInviteCaps} services={services} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <p className="text-xs text-stone-400">Votre collègue reçoit un email pour activer son accès (lien valable 72 h).</p>
            <button type="submit" disabled={busy} className={BTN_PRIMARY}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}Envoyer l&apos;invitation
            </button>
          </div>
        </form>
      )}

      <div className={CARD}>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-900">Membres</h3>
          <span className="ml-auto text-xs text-stone-400 tabular-nums">{members.length}</span>
        </div>
        <ul className="divide-y divide-stone-100">
          {members.map(m => (
            <li key={m.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3.5">
              <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-50 font-bold text-xs flex-shrink-0">
                {m.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 truncate">
                  {m.name} {m.isSelf && <span className="text-[11px] font-normal text-stone-400">(vous)</span>}
                </p>
                <p className="text-xs text-stone-400 truncate">{m.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {m.pending && <Pill color={TONE.amber}><Clock className="w-3 h-3" /> Invitation envoyée</Pill>}
                {m.expired && <Pill color={TONE.red}><Clock className="w-3 h-3" /> Invitation expirée</Pill>}
                <Pill color={ROLE_TONE[m.companyRole] || TONE.neutral}>
                  {m.companyRole === 'owner' && <ShieldCheck className="w-3 h-3" />}
                  {m.custom ? 'Droits personnalisés' : ROLE_LABEL[m.companyRole]}
                </Pill>
                <span className="text-[11px] text-stone-400 tabular-nums" title="Nombre de droits accordés">{countRights(m.capabilities)}/{TOTAL_RIGHTS}</span>
              </div>
              {editable(m) && (
                <div className="flex items-center gap-1 ml-auto sm:ml-0">
                  {(m.pending || m.expired) && (
                    <button type="button" onClick={() => resend(m)} title="Renvoyer l'invitation"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-emerald-50"><RotateCw className="w-4 h-4" /></button>
                  )}
                  <button type="button" onClick={() => setEditing(m)} title="Modifier les droits"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 border border-stone-200 hover:border-emerald-300 hover:text-emerald-800">
                    <SlidersHorizontal className="w-3.5 h-3.5" />Droits
                  </button>
                  <button type="button" onClick={() => remove(m)} title={m.pending || m.expired ? "Annuler l'invitation" : "Retirer de l'espace"}
                    className="p-1.5 rounded-lg text-stone-300 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <RightsDialog
          member={editing}
          services={services}
          allowOwner={viewerIsOwner}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg({ type: 'ok', text: `Droits de ${editing.name} mis à jour.` }); load() }}
        />
      )}
    </div>
  )
}
