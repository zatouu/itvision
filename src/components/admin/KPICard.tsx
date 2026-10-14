'use client'

import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink'
  percentage?: number
  trend?: 'up' | 'down' | 'neutral'
  link?: string
  linkText?: string
}

export default function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  percentage = 75,
  trend = 'neutral',
  link,
  linkText
}: KPICardProps) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      light: 'bg-blue-100',
      text: 'text-blue-600',
      stroke: '#3b82f6'
    },
    green: {
      bg: 'from-green-500 to-emerald-600',
      light: 'bg-green-100',
      text: 'text-green-600',
      stroke: '#10b981'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      light: 'bg-purple-100',
      text: 'text-purple-600',
      stroke: '#a855f7'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      light: 'bg-orange-100',
      text: 'text-orange-600',
      stroke: '#f97316'
    },
    pink: {
      bg: 'from-pink-500 to-pink-600',
      light: 'bg-pink-100',
      text: 'text-pink-600',
      stroke: '#ec4899'
    }
  }

  const colors = colorClasses[color]

  // Calcul pour la jauge circulaire
  const radius = 35
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative group overflow-hidden bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300">
      {/* Fond gradient animé au hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        {/* En-tête avec icône */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{value}</span>
              {trend !== 'neutral' && (
                <span className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend === 'up' ? '↑' : '↓'} 
                  {Math.abs(percentage - 50)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Icône avec cercle coloré */}
          <div className={`${colors.light} p-3 rounded-xl`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>

        {/* Jauge circulaire */}
        <div className="flex items-center justify-between mt-4">
          <div className="relative w-20 h-20">
            <svg className="transform -rotate-90 w-full h-full">
              {/* Cercle de fond */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-gray-200"
              />
              {/* Cercle de progression */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={colors.stroke}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${colors.text}`}>
                {percentage}%
              </span>
            </div>
          </div>

          {/* Sparkline (mini graphique de tendance) */}
          <div className="flex-1 ml-4">
            <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                points="0,20 20,15 40,18 60,10 80,12 100,8"
                className="opacity-50"
              />
              <polyline
                fill="none"
                stroke={colors.stroke}
                strokeWidth="3"
                points="0,20 20,15 40,18 60,10 80,12 100,8"
              />
            </svg>
          </div>
        </div>

        {/* Lien d'action */}
        {link && linkText && (
          <a 
            href={link}
            className={`mt-4 inline-flex items-center text-xs font-medium ${colors.text} hover:underline`}
          >
            {linkText} →
          </a>
        )}
      </div>
    </div>
  )
}





