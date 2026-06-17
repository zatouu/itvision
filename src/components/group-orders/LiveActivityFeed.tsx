'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User } from 'lucide-react'

interface Activity {
  type: 'group_joined' | 'group_created' | 'group_filled'
  userName: string
  groupId: string
  productName: string
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/group-orders/activities')
        const data = await res.json()
        if (data.success) {
          setActivities(data.activities || [])
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  // Seed data if empty
  const displayActivities = activities.length > 0 ? activities : [
    { type: 'group_joined' as const, userName: 'Ahmed D.', groupId: 'GRP-1', productName: 'Caméra IP 4MP', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
    { type: 'group_joined' as const, userName: 'Fatou S.', groupId: 'GRP-2', productName: 'Sneakers tendance', createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { type: 'group_created' as const, userName: 'Moussa K.', groupId: 'GRP-3', productName: 'Set palette make-up', createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
    { type: 'group_joined' as const, userName: 'Aminata B.', groupId: 'GRP-4', productName: 'Smartwatch Pro', createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
    { type: 'group_filled' as const, userName: 'Omar N.', groupId: 'GRP-5', productName: 'Lot de 10 Box cadeau', createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString() },
  ]

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-white/10" />
            <div className="flex-1 h-3 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {displayActivities.slice(0, 5).map((a, idx) => (
          <motion.div
            key={`${a.groupId}-${a.userName}-${idx}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="flex items-center gap-2.5 p-2 bg-white/10 rounded-lg backdrop-blur-sm"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-violet-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {getInitials(a.userName)}
            </div>
            <p className="text-xs text-white/90 leading-snug">
              <strong className="text-white">{a.userName}</strong>{' '}
              {a.type === 'group_joined' && 'a rejoint'}
              {a.type === 'group_created' && 'a créé un groupe pour'}
              {a.type === 'group_filled' && 'a complété'}{''}
              {a.type !== 'group_filled' && (
                <span className="text-emerald-300"> {a.productName}</span>
              )}
              <span className="text-white/50 ml-1">· {timeAgo(a.createdAt)}</span>
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
