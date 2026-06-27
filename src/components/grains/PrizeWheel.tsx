'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleDot, Sparkles, Gift } from 'lucide-react'

const WHEEL_COLORS = ['#FBBF24', '#F59E0B', '#10B981', '#7C3AED', '#EF4444', '#1DC3E1', '#8B5CF6', '#EC4899']
const OPTIONS = ['5', '10', '25', '50', '100', 'Spin', 'Cadeau', '250']

interface PrizeWheelProps {
  canSpinFree: boolean
  onSpin: () => Promise<{ result: string; grainsEarned: number }>
}

export default function PrizeWheel({ canSpinFree, onSpin }: PrizeWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [grainsEarned, setGrainsEarned] = useState(0)

  const handleSpin = async () => {
    if (spinning || !canSpinFree) return
    setSpinning(true)
    setResult(null)
    const extra = Math.floor(Math.random() * 360) + 1440
    setRotation(rotation + extra)

    setTimeout(async () => {
      try {
        const data = await onSpin()
        setResult(data.result)
        setGrainsEarned(data.grainsEarned)
      } catch {
        setResult('Essayez demain')
      } finally {
        setSpinning(false)
      }
    }, 2500)
  }

  return (
    <section className="bg-gradient-to-br from-purple-50 to-amber-50 border border-purple-200 rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
            <CircleDot className="w-5 h-5 text-purple-600" /> Roue de la chance
          </h2>
          <p className="text-sm text-slate-600 mb-4">Tournez gratuitement une fois par jour et gagnez jusqu'à 250 Grains !</p>

          <button
            onClick={handleSpin}
            disabled={spinning || !canSpinFree}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${
              canSpinFree
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {spinning ? 'Tourne...' : canSpinFree ? 'Tourner gratuitement' : 'Revenez demain'}
          </button>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 bg-white rounded-xl p-4 border border-purple-100 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-slate-900">Résultat : {result}</span>
                </div>
                {grainsEarned > 0 && (
                  <p className="text-sm text-emerald-600 mt-1 font-medium">+{grainsEarned} Grains ajoutés !</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex-shrink-0">
          <motion.div
            className="w-full h-full rounded-full border-8 border-white shadow-2xl relative overflow-hidden"
            animate={{ rotate: rotation }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'center' }}
          >
            {OPTIONS.map((label, i) => {
              const angle = (360 / OPTIONS.length) * i
              return (
                <div
                  key={i}
                  className="absolute w-full h-full flex items-center justify-center"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className="absolute w-1/2 h-full right-0"
                    style={{
                      clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                      backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length],
                    }}
                  />
                  <span
                    className="absolute text-[10px] font-bold text-white drop-shadow"
                    style={{
                      transform: `rotate(${angle + 90}deg) translateX(70px) rotate(-${angle + 90}deg)`,
                    }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </motion.div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
            <Gift className="w-6 h-6 text-purple-600" />
          </div>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-6 bg-purple-600 z-20" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
        </div>
      </div>
    </section>
  )
}
