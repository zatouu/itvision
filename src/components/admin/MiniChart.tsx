'use client'

interface MiniChartProps {
  data: number[]
  color: string
  height?: number
  showGradient?: boolean
}

export default function MiniChart({ data, color, height = 40, showGradient = true }: MiniChartProps) {
  if (data.length === 0) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg 
      viewBox="0 0 100 100" 
      className="w-full"
      style={{ height: `${height}px` }}
      preserveAspectRatio="none"
    >
      <defs>
        {showGradient && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.05 }} />
          </linearGradient>
        )}
      </defs>
      
      {/* Zone remplie sous la courbe */}
      {showGradient && (
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#${gradientId})`}
        />
      )}
      
      {/* Ligne de la courbe */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Points sur la courbe */}
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100
        const y = 100 - ((value - min) / range) * 80 - 10
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="opacity-60"
          />
        )
      })}
    </svg>
  )
}





