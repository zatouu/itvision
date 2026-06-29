'use client'

import { useState } from 'react'
import { Users, Copy, Check, MessageCircle, Link2 } from 'lucide-react'

interface ReferralBannerProps {
  referralCode: string | null
}

export default function ReferralBanner({ referralCode }: ReferralBannerProps) {
  const [copied, setCopied] = useState(false)

  const code = referralCode || 'ADMIN2024'
  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://market.itvisionplus.sn'}/market/creer-compte?ref=${code}`

  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Rejoins DDM+ avec mon code parrain ${code} et gagne 500 Grains ! ${link}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareSms = () => {
    const text = encodeURIComponent(`Rejoins DDM+ avec mon code parrain ${code} et gagne 500 Grains ! ${link}`)
    window.open(`sms:?&body=${text}`, '_blank')
  }

  return (
    <section className="bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl p-5 sm:p-6 text-white mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">Parrainez vos amis = +500 grains/parrain</h2>
          <p className="text-sm opacity-90 mt-1">Et votre filleul gagne 250 Grains à son inscription.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-white/20 rounded-xl px-4 py-2 text-sm font-mono truncate">Votre code: {code}</div>
        <button
          onClick={copy}
          className="px-3 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition text-xs font-bold"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="ml-1 hidden sm:inline">{copied ? 'Copié' : 'Copier'}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={shareWhatsApp}
          className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-emerald-400/30 hover:bg-emerald-400/50 transition text-xs font-medium"
        >
          <MessageCircle className="w-4 h-4" /> <span>WhatsApp</span>
        </button>
        <button
          onClick={shareSms}
          className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition text-xs font-medium"
        >
          <MessageCircle className="w-4 h-4" /> <span>SMS</span>
        </button>
        <button
          onClick={copy}
          className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition text-xs font-medium"
        >
          <Link2 className="w-4 h-4" /> <span>Lien</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs opacity-80">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-white/30 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-bold">
              {i === 1 ? 'A' : i === 2 ? 'M' : 'K'}
            </div>
          ))}
        </div>
        <span>5 amis parrainés = 2 500 grains gagnés</span>
      </div>
    </section>
  )
}
