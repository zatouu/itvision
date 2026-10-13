import Image from 'next/image'

interface DDMLogoProps {
  variant?: 'primary' | 'horizontal' | 'stacked' | 'mono' | 'reverse' | 'circular' | 'favicon'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'hero'
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
  circular: '/branding/ddm-logo-circular.svg',
  favicon: '/branding/ddm-logo-favicon.svg',
}

const sizeBySize: Record<string, { width: number; height: number }> = {
  sm: { width: 80, height: 34 },
  md: { width: 120, height: 50 },
  lg: { width: 160, height: 66 },
  xl: { width: 220, height: 92 },
  '2xl': { width: 280, height: 116 },
  '3xl': { width: 340, height: 142 },
  hero: { width: 420, height: 420 },
}

export function DDMLogo({
  variant = 'primary',
  size = 'md',
  showTagline = true,
  className = '',
  priority = false,
}: DDMLogoProps) {
  const dims = sizeBySize[size] || sizeBySize.md
  const src = srcByVariant[variant] || srcByVariant.primary

  if (variant === 'horizontal') {
    const height = Math.round(dims.width * (showTagline ? 60 / 280 : 56 / 164))
    return (
      <div className={`flex max-w-full items-center justify-center ${className}`} style={{ width: dims.width }}>
        <Image src={`${src}${showTagline ? '' : '#compact'}`} alt="DDM+ — Dieund Dal Ma" width={dims.width} height={height} priority={priority} unoptimized className="h-auto w-full dark:hidden" />
        <Image src={`${src}#${showTagline ? 'dark' : 'compact-dark'}`} alt="DDM+ — Dieund Dal Ma" width={dims.width} height={height} priority={priority} unoptimized className="hidden h-auto w-full dark:block" />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
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
