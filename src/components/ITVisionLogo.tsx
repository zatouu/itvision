import React from 'react'

interface ITVisionLogoProps {
  className?: string
  size?: number
  animated?: boolean
}

const ITVisionLogo: React.FC<ITVisionLogoProps> = ({ 
  className = "", 
  size = 40,
  animated = true // conservé pour compatibilité des appels
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/images/logo-it-vision.png"
        alt="IT Vision"
        style={{ height: size, width: 'auto' }}
      />
    </div>
  )
}

export default ITVisionLogo