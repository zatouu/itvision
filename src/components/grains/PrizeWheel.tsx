'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleDot, Sparkles, Gift } from 'lucide-react'

const WHEEL_COLORS = ['#FBBF24', '#F59E0B', '#10B981', '#7C3AED', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#F97316', '#84CC16']
const OPTIONS = [
  { label: '5 Grains', value: 5 },
  { label: '10 Grains', value: 10 },
  { label: '20 Grains', value: 20 },
  { label: '50 Grains', value: 50 },
  { label: '100 Grains', value: 100 },
  { label: '500 Grains', value: 500, big: true },
  { label: 'JACKPOT', value: 1000, big: true },
  { label: 'Free delivery', value: 0 },
  { label: '-10%', value: 0 },
  { label: '50 Grains', value: 50 },
]

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
    const extra = Math.floor(Math.random() * 360) + 1800
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
    }, 3000)
  }

  return (
    <section id="wheel" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
          <CircleDot className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Tentez votre chance !</h2>
      </div>

      <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-4">
        <motion.div
          className="w-full h-full rounded-full border-8 border-slate-100 shadow-2xl relative overflow-hidden"
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        >
          {OPTIONS.map((opt, i) => {
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
                  className={`absolute font-bold text-white drop-shadow text-center ${opt.big ? 'text-[9px]' : 'text-[10px]'}`}
                  style={{
                    transform: `rotate(${angle + 90}deg) translateX(78px) rotate(-${angle + 90}deg)`,
                    width: '54px',
                    lineHeight: 1,
                  }}
                >
                  {opt.label}
                </span>
              </div>
            )
          })}
        </motion.div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full shadow-lg flex items-center justify-center z-10 border-4 border-white">
          <Gift className="w-6 h-6 text-amber-900" />
        </div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-6 bg-purple-600 z-20" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || !canSpinFree}
        className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-lg ${
          canSpinFree
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
        }`}
      >
        {spinning ? 'La roue tourne...' : canSpinFree ? 'Tourner maintenant (Gratuit)' : 'Prochain tour dans 23h42min'}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm"
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
    </section>
  )
}
