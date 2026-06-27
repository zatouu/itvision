'use client'

import { Trophy, Medal, User } from 'lucide-react'

interface LeaderboardEntry {
  userId: string
  name: string
  grains: number
}

interface MonthlyContestProps {
  contest: {
    id: string
    month: string
    year: number
    prize: string
    prizeGrains: number
    endAt: string
    leaderboard: LeaderboardEntry[]
    userRank?: number | null
    userTotal?: number
  } | null
}

export default function MonthlyContest({ contest }: MonthlyContestProps) {
  if (!contest) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Concours mensuel
        </h2>
        <p className="text-sm text-slate-500">Aucun concours actif ce mois-ci. Revenez bientôt !</p>
      </section>
    )
  }

  const top3 = contest.leaderboard.slice(0, 3)
  const remaining = contest.leaderboard.slice(3)

  return (
    <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Concours mensuel
          </h2>
          <p className="text-sm text-slate-600">Gagnez <strong className="text-amber-700">{contest.prize}</strong> + {contest.prizeGrains} Grains</p>
        </div>
        {typeof contest.userRank === 'number' && (
          <div className="bg-white rounded-xl px-4 py-2 border border-amber-100">
            <p className="text-xs text-slate-500">Votre classement</p>
            <p className="font-bold text-amber-700">#{contest.userRank} — {contest.userTotal} Grains</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {top3.map((entry, idx) => (
          <div key={idx} className={`flex flex-col items-center p-3 rounded-xl border ${idx === 0 ? 'bg-amber-100 border-amber-300' : 'bg-white border-slate-200'}`}>
            <Medal className={`w-6 h-6 mb-1 ${idx === 0 ? 'text-amber-600' : idx === 1 ? 'text-slate-500' : 'text-orange-600'}`} />
            <span className="text-xs text-slate-500">#{idx + 1}</span>
            <span className="text-sm font-bold text-slate-900 text-center truncate w-full">{entry.name}</span>
            <span className="text-xs text-amber-600 font-bold">{entry.grains} G</span>
          </div>
        ))}
        {top3.length < 3 && [...Array(3 - top3.length)].map((_, i) => (
          <div key={`empty-${i}`} className="flex flex-col items-center p-3 rounded-xl border border-slate-200 bg-white/50">
            <User className="w-6 h-6 text-slate-300 mb-1" />
            <span className="text-xs text-slate-400">En attente</span>
          </div>
        ))}
      </div>

      {remaining.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
          {remaining.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-6">#{idx + 4}</span>
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-600">{entry.grains} Grains</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
