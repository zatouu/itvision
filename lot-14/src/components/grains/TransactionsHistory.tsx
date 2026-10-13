'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { History, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: string
  source: string
  description: string
  createdAt: string
}

interface TransactionsHistoryProps {
  transactions: Transaction[]
}

const TABS = ['Tout', 'Gains', 'Dépenses', 'Expirations']

export default function TransactionsHistory({ transactions }: TransactionsHistoryProps) {
  const [tab, setTab] = useState('Tout')

  const filtered = transactions.filter((t) => {
    if (tab === 'Tout') return true
    if (tab === 'Gains') return t.amount > 0
    if (tab === 'Dépenses') return t.amount < 0
    if (tab === 'Expirations') return t.source === 'expiry' || t.type === 'expiry'
    return true
  })

  if (transactions.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Historique récent</h2>
        </div>
        <p className="text-sm text-slate-500">Aucune transaction pour le moment.</p>
      </section>
    )
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Historique récent</h2>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
              tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {filtered.slice(0, 6).map((t, idx) => {
          const isPositive = t.amount > 0
          const isExpiry = t.source === 'expiry' || t.type === 'expiry'
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isExpiry ? 'bg-red-100 text-red-600' : isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {isExpiry ? <Clock className="w-4 h-4" /> : isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{t.description}</p>
                  <p className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${isExpiry ? 'text-red-500' : isPositive ? 'text-emerald-600' : 'text-orange-600'}`}>
                {isPositive ? '+' : ''}{t.amount} Grains
              </span>
            </motion.div>
          )
        })}
      </div>

      <button className="w-full mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
        Voir tout l'historique →
      </button>
    </section>
  )
}
