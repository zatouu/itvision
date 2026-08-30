'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Calendar, Flame, Gift } from 'lucide-react'
import { useState } from 'react'

const DAYS = [
  { label: 'Jour 1', reward: 5 },
  { label: 'Jour 2', reward: 5 },
  { label: 'Jour 3', reward: 10 },
  { label: 'Jour 4', reward: 10 },
  { label: 'Jour 5', reward: 15 },
  { label: 'Jour 6', reward: 20 },
  { label: 'Jour 7', reward: 50 },
]

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

  const todayIndex = Math.min(currentStreak % 7, 6)

  return (
    <section id="checkin" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" /> Connectez-vous chaque jour pour gagner !
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            <Flame className="w-4 h-4 inline text-orange-500 mr-1" />
            <strong className="text-orange-600">{currentStreak} jours de suite !</strong> — Total {totalDays} jours
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {DAYS.map((day, idx) => {
          const isPast = idx < todayIndex
          const isToday = idx === todayIndex && !checked
          const isCompleted = idx < todayIndex || (idx === todayIndex && checked)
          const isMystery = idx === 6

          return (
            <div
              key={idx}
              className={`flex flex-col items-center p-2 sm:p-3 rounded-xl border-2 transition relative overflow-hidden ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-400'
                  : isToday
                  ? 'bg-emerald-100 border-emerald-500'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <span className="text-[10px] text-slate-500 font-medium">{day.label}</span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center my-1 ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isToday
                  ? 'bg-white text-emerald-600 border border-emerald-500'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : isMystery ? <Gift className="w-4 h-4" /> : <span className="text-[10px] font-bold">+</span>}
              </div>
              <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isMystery ? '+MYSTERY GIFT' : `+${day.reward} grains`}
              </span>

              {isToday && (
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="mt-2 w-full py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition"
                >
                  {loading ? '...' : `Récupérer ${day.reward} Grains`}
                </button>
              )}
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
            <Check className="w-4 h-4" /> Bravo ! Vous avez gagné vos Grains aujourd'hui.
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
