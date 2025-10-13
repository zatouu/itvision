import React from 'react'

interface TechLinesProps {
  className?: string
  density?: 'low' | 'medium' | 'high'
  animated?: boolean
  opacity?: number
}

const TechLines: React.FC<TechLinesProps> = ({ 
  className = "", 
  density = 'medium',
  animated = true,
  opacity = 0.1
}) => {
  const getDensityConfig = () => {
    switch (density) {
      case 'low':
        return { lines: 8, nodes: 12 }
      case 'high':
        return { lines: 20, nodes: 30 }
      default:
        return { lines: 14, nodes: 20 }
    }
  }

  const config = getDensityConfig()

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ opacity }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 1200 800" 
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          
          <filter id="techGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Lignes horizontales */}
        <g stroke="url(#techGradient)" strokeWidth="1" fill="none" opacity="0.6">
          {Array.from({ length: Math.floor(config.lines / 2) }).map((_, i) => (
            <g key={`horizontal-${i}`}>
              <line 
                x1="0" 
                y1={100 + i * 120} 
                x2="1200" 
                y2={100 + i * 120}
                strokeDasharray="20,10"
                filter="url(#techGlow)"
              >
                {animated && (
                  <animate 
                    attributeName="stroke-dashoffset" 
                    values="0;30;0" 
                    dur={`${8 + i * 2}s`} 
                    repeatCount="indefinite"
                  />
                )}
              </line>
              {/* Segments avec différents styles */}
              <line 
                x1={200 + i * 150} 
                y1={100 + i * 120} 
                x2={400 + i * 150} 
                y2={100 + i * 120}
                strokeWidth="2"
                strokeDasharray="5,5"
              >
                {animated && (
                  <animate 
                    attributeName="opacity" 
                    values="0.3;1;0.3" 
                    dur={`${4 + i}s`} 
                    repeatCount="indefinite"
                  />
                )}
              </line>
            </g>
          ))}
        </g>

        {/* Lignes verticales */}
        <g stroke="url(#techGradient)" strokeWidth="1" fill="none" opacity="0.4">
          {Array.from({ length: Math.floor(config.lines / 3) }).map((_, i) => (
            <line 
              key={`vertical-${i}`}
              x1={150 + i * 200} 
              y1="0" 
              x2={150 + i * 200} 
              y2="800"
              strokeDasharray="15,25"
              filter="url(#techGlow)"
            >
              {animated && (
                <animate 
                  attributeName="stroke-dashoffset" 
                  values="0;40;0" 
                  dur={`${10 + i * 1.5}s`} 
                  repeatCount="indefinite"
                />
              )}
            </line>
          ))}
        </g>

        {/* Lignes diagonales */}
        <g stroke="url(#techGradient)" strokeWidth="0.8" fill="none" opacity="0.3">
          {Array.from({ length: Math.floor(config.lines / 4) }).map((_, i) => (
            <line 
              key={`diagonal-${i}`}
              x1={i * 300} 
              y1="0" 
              x2={400 + i * 300} 
              y2="800"
              strokeDasharray="10,15"
            >
              {animated && (
                <animate 
                  attributeName="opacity" 
                  values="0.1;0.6;0.1" 
                  dur={`${12 + i * 2}s`} 
                  repeatCount="indefinite"
                />
              )}
            </line>
          ))}
        </g>

        {/* Noeuds de connexion */}
        <g fill="url(#techGradient)">
          {Array.from({ length: config.nodes }).map((_, i) => (
            <circle 
              key={`node-${i}`}
              cx={100 + (i * 97) % 1100} 
              cy={80 + Math.floor(i / 11) * 120} 
              r="2"
              filter="url(#techGlow)"
            >
              {animated && (
                <animate 
                  attributeName="r" 
                  values="2;4;2" 
                  dur={`${3 + (i % 5)}s`} 
                  repeatCount="indefinite"
                />
              )}
              {animated && (
                <animate 
                  attributeName="opacity" 
                  values="0.5;1;0.5" 
                  dur={`${4 + (i % 3)}s`} 
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* Cercles tech décoratifs */}
        <g stroke="url(#techGradient)" strokeWidth="1" fill="none" opacity="0.2">
          {Array.from({ length: 6 }).map((_, i) => (
            <circle 
              key={`circle-${i}`}
              cx={200 + i * 180} 
              cy={150 + (i % 3) * 200} 
              r={30 + i * 10}
              strokeDasharray="3,6"
            >
              {animated && (
                <animateTransform 
                  attributeName="transform" 
                  type="rotate" 
                  values={`0 ${200 + i * 180} ${150 + (i % 3) * 200};360 ${200 + i * 180} ${150 + (i % 3) * 200}`}
                  dur={`${15 + i * 3}s`} 
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* Pulsations lumineuses */}
        <g>
          {Array.from({ length: 8 }).map((_, i) => (
            <circle 
              key={`pulse-${i}`}
              cx={150 + i * 130} 
              cy={100 + (i % 4) * 150} 
              r="1"
              fill="url(#techGradient)"
              filter="url(#techGlow)"
            >
              {animated && (
                <>
                  <animate 
                    attributeName="r" 
                    values="1;8;1" 
                    dur={`${6 + i}s`} 
                    repeatCount="indefinite"
                  />
                  <animate 
                    attributeName="opacity" 
                    values="1;0.1;1" 
                    dur={`${6 + i}s`} 
                    repeatCount="indefinite"
                  />
                </>
              )}
            </circle>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default TechLines