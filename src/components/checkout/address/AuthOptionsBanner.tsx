import Link from 'next/link'

interface AuthOptionsBannerProps {
  mode: 'guest' | 'login' | 'register'
  onSetMode: (mode: 'guest' | 'login' | 'register') => void
}

export default function AuthOptionsBanner({ mode, onSetMode }: AuthOptionsBannerProps) {
  return (
    <div className="bg-ddm-emerald-light/60 border border-ddm-emerald/30 rounded-xl p-4">
      <p className="text-sm font-bold text-ddm-navy mb-3">🚀 Gagnez du temps en vous connectant</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm cursor-pointer">
          <input
            type="radio"
            name="authMode"
            checked={mode === 'guest'}
            onChange={() => onSetMode('guest')}
            className="accent-ddm-emerald"
          />
          <span>Commander en invité</span>
        </label>
        <Link
          href="/login"
          className="px-3 py-2 bg-ddm-navy text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          Se connecter
        </Link>
        <Link
          href="/market/creer-compte"
          className="px-3 py-2 border border-ddm-emerald text-ddm-emerald-dark rounded-lg text-sm font-medium hover:bg-ddm-emerald-light transition"
        >
          Créer un compte (+250 🪙)
        </Link>
      </div>
    </div>
  )
}
