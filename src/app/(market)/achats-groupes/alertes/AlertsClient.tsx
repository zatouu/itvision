'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff, MessageCircle, ArrowLeft } from 'lucide-react'

export default function AlertsClient({ channelUrl }: { channelUrl: string }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'' | 'sub' | 'unsub'>('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const call = async (mode: 'sub' | 'unsub') => {
    if (!phone.trim()) { setMsg({ ok: false, text: 'Indiquez votre numéro de téléphone.' }); return }
    setBusy(mode); setMsg(null)
    try {
      const res = await fetch('/api/group-orders/interests', {
        method: mode === 'sub' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'sub' ? { phone, name: name || undefined } : { phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setMsg({ ok: false, text: data.error || 'Une erreur est survenue, réessayez.' })
      } else if (mode === 'sub') {
        setMsg({ ok: true, text: data.already ? 'Vous êtes déjà inscrit. Vous serez prévenu à chaque nouvel achat groupé.' : 'C\'est noté. Vous serez prévenu à chaque nouvel achat groupé.' })
      } else {
        setMsg({ ok: true, text: 'Vous ne recevrez plus d\'alertes DDM+ sur ce numéro.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Connexion impossible, réessayez.' })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 md:pb-0">
      <div className="bg-[#1A1A2E] text-white">
        <div className="mx-auto max-w-lg px-4 py-5">
          <Link href="/achats-groupes" className="mb-3 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Achats groupés
          </Link>
          <h1 className="text-xl font-bold">Alertes achats groupés</h1>
          <p className="mt-1 text-sm text-white/70">Chaque nouveau groupe vous est annoncé, sans avoir à ouvrir DDM+.</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {channelUrl && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl bg-[#25D366] p-4 text-white shadow-sm hover:opacity-95"
          >
            <MessageCircle className="h-8 w-8 shrink-0" />
            <div>
              <div className="font-bold">Suivre la chaîne WhatsApp DDM+</div>
              <div className="text-xs text-white/90">Tous les nouveaux achats groupés, en direct dans WhatsApp. Gratuit, sans partager votre numéro.</div>
            </div>
          </a>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#00C853]" />
            <h2 className="font-semibold text-gray-900">Recevoir les alertes sur mon numéro</h2>
          </div>
          <div className="space-y-3">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="77 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#00C853] focus:outline-none"
            />
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Prénom (facultatif)"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-[#00C853] focus:outline-none"
            />
            <button
              type="button"
              disabled={!!busy}
              onClick={() => call('sub')}
              className="h-11 w-full rounded-xl bg-[#00C853] text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy === 'sub' ? 'Inscription…' : 'Me prévenir à chaque nouveau groupe'}
            </button>
          </div>
          {msg && (
            <p className={`mt-3 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <BellOff className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Ne plus recevoir d&apos;alertes</h2>
          </div>
          <p className="mb-3 text-xs text-gray-500">Saisissez votre numéro ci-dessus puis confirmez. Toutes vos alertes DDM+ (nouveaux groupes, produits suivis, rappels de clôture) seront supprimées.</p>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => call('unsub')}
            className="h-11 w-full rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {busy === 'unsub' ? 'Désinscription…' : 'Me désinscrire'}
          </button>
        </div>
      </div>
    </div>
  )
}
