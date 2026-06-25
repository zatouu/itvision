import Image from 'next/image'

interface DDMLogoProps {
  variant?: 'primary' | 'horizontal' | 'stacked' | 'mono' | 'reverse'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  className?: string
  priority?: boolean
}

const srcByVariant: Record<string, string> = {
  primary: '/branding/ddm-logo-primary.svg',
  horizontal: '/branding/ddm-logo-horizontal.svg',
  stacked: '/branding/ddm-logo-stacked.svg',
  mono: '/branding/ddm-logo-mono.svg',
  reverse: '/branding/ddm-logo-reverse.svg',
}

const sizeBySize: Record<string, { width: number; height: number }> = {
  sm: { width: 80, height: 34 },
  md: { width: 120, height: 50 },
  lg: { width: 160, height: 66 },
  xl: { width: 220, height: 92 },
}

export function DDMLogo({
  variant = 'primary',
  size = 'md',
  showTagline = true,
  className = '',
  priority = false,
}: DDMLogoProps) {
  const dims = sizeBySize[size]
  const src = srcByVariant[variant] || srcByVariant.primary

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={src}
        alt="DDM+ — Dieund Dal Ma"
        width={dims.width}
        height={dims.height}
        priority={priority}
        className="object-contain"
      />
    </div>
  )
}

export default DDMLogo
