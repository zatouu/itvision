'use client'

import { useState } from 'react'
import { Users, Copy, Check, Share2 } from 'lucide-react'

interface ReferralBannerProps {
  referralCode: string | null
}

export default function ReferralBanner({ referralCode }: ReferralBannerProps) {
  const [copied, setCopied] = useState(false)

  const link = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://market.itvisionplus.sn'}/market/creer-compte?ref=${referralCode}`
    : ''

  const copy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Rejoins DDM+', text: 'Inscris-toi avec mon lien et gagne des Grains !', url: link })
      } catch {}
    } else {
      copy()
    }
  }

  return (
    <section className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 sm:p-6 text-white mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Invitez vos amis</h2>
          <p className="text-sm opacity-90">Gagnez 100 Grains par inscription et 500 Grains sur leur première commande.</p>
        </div>
      </div>

      {link ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-xl px-4 py-2 text-sm truncate font-mono">{link}</div>
          <button onClick={copy} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button onClick={share} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <p className="text-sm opacity-80">Connectez-vous pour obtenir votre lien de parrainage.</p>
      )}
    </section>
  )
}
