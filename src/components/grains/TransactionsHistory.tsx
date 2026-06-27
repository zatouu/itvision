'use client'

import { History, ArrowUpRight, ArrowDownRight, Gift } from 'lucide-react'

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

export default function TransactionsHistory({ transactions }: TransactionsHistoryProps) {
  if (transactions.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-slate-600" /> Historique
        </h2>
        <p className="text-sm text-slate-500">Aucune transaction pour le moment.</p>
      </section>
    )
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-slate-600" /> Historique
      </h2>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {transactions.map((t) => {
          const isPositive = t.amount > 0
          return (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.description}</p>
                  <p className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-orange-600'}`}>
                {isPositive ? '+' : ''}{t.amount} Grains
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
