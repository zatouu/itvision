import React from 'react'

interface ITVisionLogoProps {
  className?: string
  size?: number
  animated?: boolean
}

const ITVisionLogo: React.FC<ITVisionLogoProps> = ({ 
  className = "", 
  size = 40,
  animated = true
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 60 60" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Dégradés */}
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="combinedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          
          {/* Filtres de glow */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Forme de base en diamant arrondi */}
        <path
          d="M30 5 L50 20 Q55 25 55 30 L50 40 Q50 45 45 50 L30 55 Q25 55 20 50 L10 40 Q5 35 5 30 L10 20 Q10 15 15 10 L30 5 Q25 5 30 5 Z"
          fill="url(#combinedGradient)"
          filter={animated ? "url(#glow)" : "none"}
          className={animated ? "animate-pulse" : ""}
        />

        {/* Checkmark stylisé */}
        <path
          d="M20 28 L26 34 L42 18"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className={animated ? "animate-pulse" : ""}
          style={{
            animationDelay: animated ? "0.5s" : "0s"
          }}
        />

        {/* Éléments tech décoratifs */}
        <g stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none">
          {/* Lignes tech autour du logo */}
          <circle cx="30" cy="30" r="22" strokeDasharray="2,3" opacity="0.6">
            {animated && (
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                values="0 30 30;360 30 30" 
                dur="8s" 
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx="30" cy="30" r="25" strokeDasharray="1,4" opacity="0.4">
            {animated && (
              <animateTransform 
                attributeName="transform" 
                type="rotate" 
                values="360 30 30;0 30 30" 
                dur="12s" 
                repeatCount="indefinite"
              />
            )}
          </circle>
        </g>

        {/* Points lumineux */}
        <g fill="white">
          <circle cx="15" cy="15" r="1" opacity="0.8">
            {animated && (
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
          <circle cx="45" cy="15" r="1" opacity="0.6">
            {animated && (
              <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
            )}
          </circle>
          <circle cx="15" cy="45" r="1" opacity="0.7">
            {animated && (
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
            )}
          </circle>
          <circle cx="45" cy="45" r="1" opacity="0.5">
            {animated && (
              <animate attributeName="opacity" values="0.5;1;0.5" dur="3.5s" repeatCount="indefinite" />
            )}
          </circle>
        </g>
      </svg>
      
      {/* Texte IT Vision */}
      <div className="flex flex-col">
        <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-purple-600 bg-clip-text text-transparent">
          IT
        </span>
        <span className="text-sm font-semibold text-gray-700 -mt-1">
          Vision
        </span>
      </div>
    </div>
  )
}

export default ITVisionLogo