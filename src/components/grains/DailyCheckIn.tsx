'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Calendar } from 'lucide-react'
import { useState } from 'react'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface DailyCheckInProps {
  checkedInToday: boolean
  streak: number
  totalDays: number
  onCheckIn: () => Promise<void>
}

export default function DailyCheckIn({ checkedInToday, streak, totalDays, onCheckIn }: DailyCheckInProps) {
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(checkedInToday)
  const [currentStreak, setCurrentStreak] = useState(streak)

  const handleCheckIn = async () => {
    if (checked || loading) return
    setLoading(true)
    try {
      await onCheckIn()
      setChecked(true)
      setCurrentStreak(currentStreak + 1)
    } catch {
      // error handled by parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" /> Check-in quotidien
          </h2>
          <p className="text-sm text-slate-500">Série actuelle : <strong className="text-amber-600">{currentStreak} jour(s)</strong> — Total : {totalDays} jour(s)</p>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={checked || loading}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            checked
              ? 'bg-emerald-100 text-emerald-700 cursor-default'
              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200'
          }`}
        >
          {checked ? (
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Fait</span>
          ) : loading ? (
            '...'
          ) : (
            'Check-in +5'
          )}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, idx) => {
          const isPast = idx < (currentStreak % 7)
          const isToday = idx === currentStreak % 7 && checked
          return (
            <div
              key={day}
              className={`flex flex-col items-center p-2 rounded-xl border-2 transition ${
                isToday || isPast
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <span className="text-[10px] text-slate-500">{day}</span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${isToday || isPast ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {isToday || isPast ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px]">+</span>}
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Bravo ! Vous avez gagné des Grains aujourd'hui.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
