'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import GrainsHero from '@/components/grains/GrainsHero'
import DailyCheckIn from '@/components/grains/DailyCheckIn'
import ChallengesGrid from '@/components/grains/ChallengesGrid'
import PrizeWheel from '@/components/grains/PrizeWheel'
import RewardsShop from '@/components/grains/RewardsShop'
import MonthlyContest from '@/components/grains/MonthlyContest'
import VIPTiersLadder from '@/components/grains/VIPTiersLadder'
import ReferralBanner from '@/components/grains/ReferralBanner'
import TransactionsHistory from '@/components/grains/TransactionsHistory'

interface DashboardData {
  success: boolean
  error?: string
  user: {
    id: string
    name: string
    tier: string
    balance: number
    referralCode: string | null
  }
  checkIn: {
    checkedInToday: boolean
    streak: number
    totalDays: number
    grainsEarned: number
  }
  challenges: any[]
  wheel: {
    lastSpin: string | null
    canSpinFree: boolean
  }
  rewards: any[]
  contest: any
  transactions: any[]
  tiers: { name: string; min: number; color: string; current: boolean }[]
  progressToNext: number
}

export default function GrainsPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/grains')
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/grains')
          return
        }
        throw new Error(json.error || 'Erreur')
      }
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [router])

  const handleCheckIn = async () => {
    const res = await fetch('/api/grains/check-in', { method: 'POST' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    showToast(`+${json.grainsEarned} Grains — Série de ${json.streak} jours !`)
    await fetchDashboard()
  }

  const handleClaim = async (challengeId: string) => {
    const res = await fetch('/api/grains/challenges/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    showToast(`+${json.grainsEarned} Grains récupérés !`)
    await fetchDashboard()
  }

  const handleSpin = async () => {
    const res = await fetch('/api/grains/wheel/spin', { method: 'POST' })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    await fetchDashboard()
    return { result: json.result, grainsEarned: json.grainsEarned }
  }

  const handleRedeem = async (rewardId: string) => {
    const res = await fetch('/api/grains/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    await fetchDashboard()
    return { code: json.code, expiresAt: json.expiresAt }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-bold mb-2">{error || 'Impossible de charger le programme'}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Réessayer</button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GrainsHero name={data.user.name} balance={data.user.balance} tier={data.user.tier} />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div>
              <DailyCheckIn
                checkedInToday={data.checkIn.checkedInToday}
                streak={data.checkIn.streak}
                totalDays={data.checkIn.totalDays}
                onCheckIn={handleCheckIn}
              />
              <PrizeWheel canSpinFree={data.wheel.canSpinFree} onSpin={handleSpin} />
              <ChallengesGrid challenges={data.challenges} onClaim={handleClaim} />
              <RewardsShop rewards={data.rewards} balance={data.user.balance} onRedeem={handleRedeem} />
              <MonthlyContest contest={data.contest} />
            </div>
            <div>
              <VIPTiersLadder tiers={data.tiers} balance={data.user.balance} progressToNext={data.progressToNext} />
              <ReferralBanner referralCode={data.user.referralCode} />
              <TransactionsHistory transactions={data.transactions} />
            </div>
          </div>
        </motion.div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {toast}
        </div>
      )}
    </main>
  )
}
