import React from 'react'

type SkeletonVariant = 'text' | 'avatar' | 'rect' | 'card' | 'badge' | 'title' | 'button' | 'table-row'

type SkeletonProps = {
  className?: string
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  rounded?: boolean
}

const baseClass = 'animate-pulse bg-gray-200 dark:bg-gray-700'

export default function Skeleton({ className = '', variant = 'rect', width, height, rounded = true }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  const shapeClass = rounded ? 'rounded-md' : ''

  switch (variant) {
    case 'text':
      return <div className={`${baseClass} h-4 ${shapeClass} ${className}`} style={style} />
    case 'title':
      return <div className={`${baseClass} h-6 ${shapeClass} ${className}`} style={style} />
    case 'badge':
      return <div className={`${baseClass} h-5 w-16 ${shapeClass} ${className}`} style={style} />
    case 'button':
      return <div className={`${baseClass} h-10 w-24 ${shapeClass} ${className}`} style={style} />
    case 'avatar':
      return <div className={`${baseClass} h-10 w-10 rounded-full ${className}`} style={style} />
    case 'card':
      return (
        <div className={`border border-gray-200 dark:border-gray-600 rounded-xl p-4 ${className}`}>
          <div className={`${baseClass} h-40 rounded-lg mb-4`} />
          <div className="space-y-2">
            <div className={`${baseClass} h-5 w-3/4 rounded`} />
            <div className={`${baseClass} h-4 w-5/6 rounded`} />
            <div className={`${baseClass} h-4 w-2/3 rounded`} />
          </div>
          <div className="mt-4 flex gap-2">
            <div className={`${baseClass} h-9 w-24 rounded`} />
            <div className={`${baseClass} h-9 w-24 rounded`} />
          </div>
        </div>
      )
    case 'table-row':
      return (
        <tr className="border-b border-gray-100">
          <td className="p-3"><div className={`${baseClass} h-4 w-6 rounded`} /></td>
          <td className="p-3"><div className={`${baseClass} h-4 w-40 rounded`} /></td>
          <td className="p-3"><div className={`${baseClass} h-4 w-32 rounded`} /></td>
          <td className="p-3"><div className={`${baseClass} h-4 w-24 rounded`} /></td>
          <td className="p-3"><div className={`${baseClass} h-8 w-20 rounded`} /></td>
        </tr>
      )
    default:
      return <div className={`${baseClass} ${shapeClass} ${className}`} style={style} />
  }
}

