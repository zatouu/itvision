export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  requirements: {
    minLength: boolean
    hasUpperCase: boolean
    hasLowerCase: boolean
    hasNumbers: boolean
    hasSpecialChar: boolean
  }
}

export function validatePassword(password: string): PasswordValidation {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const requirements = {
    minLength: password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar
  }

  const errors: string[] = []

  if (!requirements.minLength) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères')
  }
  if (!requirements.hasUpperCase) {
    errors.push('Le mot de passe doit contenir au moins une majuscule')
  }
  if (!requirements.hasLowerCase) {
    errors.push('Le mot de passe doit contenir au moins une minuscule')
  }
  if (!requirements.hasNumbers) {
    errors.push('Le mot de passe doit contenir au moins un chiffre')
  }
  if (!requirements.hasSpecialChar) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial')
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements
  }
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' | 'very-strong' {
  const validation = validatePassword(password)
  const score = Object.values(validation.requirements).filter(Boolean).length

  if (score <= 2) return 'weak'
  if (score === 3) return 'medium'
  if (score === 4) return 'strong'
  return 'very-strong'
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak': return 'text-red-500'
    case 'medium': return 'text-yellow-500'
    case 'strong': return 'text-blue-500'
    case 'very-strong': return 'text-green-500'
    default: return 'text-gray-500'
  }
}

export function getPasswordStrengthText(strength: string): string {
  switch (strength) {
    case 'weak': return 'Faible'
    case 'medium': return 'Moyen'
    case 'strong': return 'Fort'
    case 'very-strong': return 'Très fort'
    default: return 'Inconnu'
  }
}