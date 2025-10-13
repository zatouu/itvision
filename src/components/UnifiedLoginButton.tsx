'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn, ChevronDown } from 'lucide-react'

interface UnifiedLoginButtonProps {
  className?: string
  variant?: 'default' | 'header' | 'hero'
}

export default function UnifiedLoginButton({ 
  className = "", 
  variant = 'default' 
}: UnifiedLoginButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const getButtonStyles = () => {
    switch (variant) {
      case 'header':
        return "text-gray-700 hover:text-emerald-600 px-4 py-2.5 text-base font-semibold transition-all duration-300 hover:bg-emerald-50 rounded-lg relative group"
      case 'hero':
        return "bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center"
    }
  }

  const loginOptions: never[] = []

  if (variant === 'header') {
    return (
      <Link
        href="/login"
        className={`${getButtonStyles()} ${className} inline-flex items-center`}
      >
        Connexion
      </Link>
    )
  }

  return (
    <Link href="/login" className={`${getButtonStyles()} ${className} inline-flex items-center`}>
      <LogIn className="h-5 w-5 mr-2" />
      Connexion
    </Link>
  )
}