'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  deadline: string
  urgency?: 'urgent' | 'medium' | 'low'
}

export default function CountdownBadge({ deadline, urgency = 'low' }: Props) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.max(0, diff)
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(deadline).getTime() - Date.now()
      setTimeLeft(Math.max(0, diff))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

  let colorClass = 'bg-slate-100 text-slate-700'
  if (days < 1) colorClass = 'bg-red-100 text-red-700 animate-pulse'
  else if (days < 3) colorClass = 'bg-orange-100 text-orange-700'
  else if (days < 7) colorClass = 'bg-amber-100 text-amber-700'

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${colorClass}`}>
      <Clock className="w-3.5 h-3.5" />
      {days > 0 && <span>{days}j</span>}
      <span>{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m</span>
    </div>
  )
}
