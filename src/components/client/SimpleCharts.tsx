'use client'

import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'

interface ProgressChartProps {
  data: { label: string; value: number; color?: string }[]
  title: string
}

export function ProgressBarChart({ data, title }: ProgressChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 100)
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-emerald-600">{item.value}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color || 'bg-gradient-to-r from-emerald-500 to-green-600'
                }`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface InvestmentData {
  month: string
  value: number
}

interface InvestmentChartProps {
  data: InvestmentData[]
  title: string
  trend?: 'up' | 'down'
  trendValue?: string
}

export function InvestmentLineChart({ data, title, trend, trendValue }: InvestmentChartProps) {
  if (data.length === 0) return null
  
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const height = 200
  const width = 100
  const padding = 20
  
  // Générer les points du graphique
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (d.value / maxValue) * (height - padding)
    return `${x},${y}`
  }).join(' ')
  
  // Générer la zone remplie
  const areaPoints = `0,${height} ${points} ${width},${height}`
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {trendValue}
          </div>
        )}
      </div>
      
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
          {/* Grille horizontale */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#e5e7eb" strokeWidth="0.5" />
          
          {/* Zone remplie */}
          <polygon points={areaPoints} fill="url(#gradient)" opacity="0.3" />
          
          {/* Ligne */}
          <polyline
            points={points}
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * width
            const y = height - (d.value / maxValue) * (height - padding)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="1.5"
              />
            )
          })}
          
          {/* Gradient */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Légendes X */}
        <div className="flex justify-between mt-2 px-1">
          {data.map((d, i) => (
            <span key={i} className="text-xs text-gray-500">
              {d.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
  centerValue?: string
  centerLabel?: string
}

export function DonutChart({ data, title, centerValue, centerLabel }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = -90
  const radius = 45
  const centerX = 50
  const centerY = 50
  const innerRadius = 30
  
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle)
    const end = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    
    const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle)
    const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle)
    
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ')
  }
  
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees * Math.PI) / 180
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    }
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((item, idx) => {
              const angle = (item.value / total) * 360
              const path = createArc(currentAngle, currentAngle + angle)
              currentAngle += angle
              
              return (
                <path
                  key={idx}
                  d={path}
                  fill={item.color}
                  className="transition-all duration-300 hover:opacity-80"
                />
              )
            })}
          </svg>
          
          {/* Center text */}
          {centerValue && (
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-2xl font-bold text-gray-900">{centerValue}</div>
              {centerLabel && <div className="text-xs text-gray-500">{centerLabel}</div>}
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'increase' | 'decrease'
  icon?: React.ReactNode
  color?: string
}

export function StatsCard({ title, value, change, changeType, icon, color = 'emerald' }: StatsCardProps) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon && (
          <div className={`p-2 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald} rounded-lg text-white`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
      {change && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {changeType === 'increase' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {change}
        </div>
      )}
    </div>
  )
}





