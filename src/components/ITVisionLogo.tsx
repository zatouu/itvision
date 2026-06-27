'use client'

import DDMLogo from './branding/DDMLogo'

interface ITVisionLogoProps {
  className?: string
  size?: number
  animated?: boolean
}

export default function ITVisionLogo({ 
  className = "", 
  size = 40,
  animated = true // conservé pour compatibilité des appels
}: ITVisionLogoProps) {
  const sizeScale = size <= 60 ? 'sm' : size <= 100 ? 'md' : size <= 160 ? 'lg' : 'xl'
  return (
    <DDMLogo
      variant="horizontal"
      size={sizeScale}
      className={className}
      priority={animated}
    />
  )
}
