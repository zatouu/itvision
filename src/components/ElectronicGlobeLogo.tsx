import React from 'react'

interface ElectronicGlobeLogoProps {
  className?: string
  size?: number
}

const ElectronicGlobeLogo: React.FC<ElectronicGlobeLogoProps> = ({ 
  className = "", 
  size = 32 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Globe circle */}
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      
      {/* Circuit grid background */}
      <defs>
        <pattern id="circuitGrid" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.5" fill="currentColor" opacity="0.3"/>
        </pattern>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#circuitGrid)" opacity="0.1"/>
      
      {/* North America */}
      <path d="M8 10 L11 8 L13 9 L12 12 L9 13 Z" fill="currentColor" opacity="0.8"/>
      <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* South America */}
      <path d="M10 18 L12 16 L13 20 L11 22 L9 21 Z" fill="currentColor" opacity="0.8"/>
      <circle cx="11" cy="19" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* Europe */}
      <path d="M15 8 L18 7 L19 9 L17 11 L15 10 Z" fill="currentColor" opacity="0.8"/>
      <circle cx="17" cy="9" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* Africa */}
      <path d="M16 14 L19 13 L20 17 L18 20 L16 19 Z" fill="currentColor" opacity="0.8"/>
      <circle cx="18" cy="16" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* Asia/Oceania */}
      <path d="M22 10 L25 9 L26 13 L24 15 L22 14 Z" fill="currentColor" opacity="0.8"/>
      <circle cx="24" cy="12" r="1" fill="currentColor" opacity="0.6"/>
      
      {/* Electronic connections between continents */}
      <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6">
        {/* Connection lines with electronic style */}
        <path d="M10 10 Q16 6 17 9" strokeDasharray="1,1"/>
        <path d="M17 9 Q22 8 24 12" strokeDasharray="1,1"/>
        <path d="M18 16 Q14 12 17 9" strokeDasharray="1,1"/>
        <path d="M11 19 Q14 16 18 16" strokeDasharray="1,1"/>
        <path d="M24 12 Q20 14 18 16" strokeDasharray="1,1"/>
        
        {/* Additional circuit paths */}
        <path d="M10 10 L11 19" strokeDasharray="2,1" opacity="0.4"/>
        <path d="M17 9 L18 16" strokeDasharray="2,1" opacity="0.4"/>
        <path d="M24 12 Q16 16 11 19" strokeDasharray="1,2" opacity="0.4"/>
      </g>
      
      {/* Circuit nodes at connection points */}
      <g fill="currentColor">
        <circle cx="13" cy="12" r="0.8" opacity="0.8"/>
        <circle cx="20" cy="11" r="0.8" opacity="0.8"/>
        <circle cx="15" cy="16" r="0.8" opacity="0.8"/>
        <circle cx="22" cy="14" r="0.8" opacity="0.8"/>
      </g>
      
      {/* Glowing effect for the main globe */}
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.2"/>
      
      {/* Electronic pulse animation paths */}
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4">
        <circle cx="16" cy="16" r="8" strokeDasharray="3,3" opacity="0.3">
          <animateTransform 
            attributeName="transform" 
            type="rotate" 
            values="0 16 16;360 16 16" 
            dur="8s" 
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="16" cy="16" r="11" strokeDasharray="2,4" opacity="0.2">
          <animateTransform 
            attributeName="transform" 
            type="rotate" 
            values="360 16 16;0 16 16" 
            dur="12s" 
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  )
}

export default ElectronicGlobeLogo