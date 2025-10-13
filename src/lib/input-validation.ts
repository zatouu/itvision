import { logSecurityViolation } from './security-logger'
import { NextRequest } from 'next/server'

// Patterns de validation
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  username: /^[a-zA-Z0-9._-]{3,30}$/,
  projectId: /^[A-Z]{3}-\d{3}$/,
  reportId: /^RPT-\d{8}-[A-Z0-9]{4,9}$/,
  filename: /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{2,4}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
}

// Listes noires de mots dangereux
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /vbscript:/i,
  /data:text\/html/i,
  /\.\.\/\.\.\//,  // Path traversal
  /\|\||\&\&/,     // Command injection
  /;|\|/,          // Command chaining
  /\$\(/,          // Shell injection
  /`/,             // Template injection
]

// Mots-clés SQL suspects
const SQL_INJECTION_PATTERNS = [
  /union\s+select/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /update\s+set/i,
  /exec\s*\(/i,
  /xp_cmdshell/i,
  /sp_executesql/i,
  /--/,
  /\/\*/,
  /\*\//
]

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: string
  risk: 'low' | 'medium' | 'high' | 'critical'
}

export class InputValidator {
  
  // Validation générale d'une chaîne
  static validateString(
    input: string,
    options: {
      minLength?: number
      maxLength?: number
      pattern?: RegExp
      allowEmpty?: boolean
      fieldName?: string
    } = {}
  ): ValidationResult {
    const errors: string[] = []
    let risk: ValidationResult['risk'] = 'low'

    // Vérifications de base
    if (!options.allowEmpty && (!input || input.trim().length === 0)) {
      errors.push(`${options.fieldName || 'Champ'} requis`)
      return { isValid: false, errors, risk: 'medium' }
    }

    if (options.minLength && input.length < options.minLength) {
      errors.push(`${options.fieldName || 'Champ'} trop court (min: ${options.minLength})`)
    }

    if (options.maxLength && input.length > options.maxLength) {
      errors.push(`${options.fieldName || 'Champ'} trop long (max: ${options.maxLength})`)
      risk = 'medium'
    }

    if (options.pattern && !options.pattern.test(input)) {
      errors.push(`${options.fieldName || 'Champ'} format invalide`)
      risk = 'medium'
    }

    // Vérification des patterns dangereux
    const dangerousFound = DANGEROUS_PATTERNS.some(pattern => pattern.test(input))
    if (dangerousFound) {
      errors.push('Contenu potentiellement dangereux détecté')
      risk = 'critical'
    }

    // Vérification SQL injection
    const sqlFound = SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
    if (sqlFound) {
      errors.push('Tentative d\'injection SQL détectée')
      risk = 'critical'
    }

    // Sanitisation de base
    const sanitized = input
      .trim()
      .replace(/[<>]/g, '') // Supprimer les balises HTML de base
      .substring(0, options.maxLength || 1000) // Limiter la longueur

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
      risk
    }
  }

  // Validation spécifique par type
  static validateEmail(email: string): ValidationResult {
    return this.validateString(email, {
      pattern: VALIDATION_PATTERNS.email,
      maxLength: 255,
      fieldName: 'Email'
    })
  }

  static validatePhone(phone: string): ValidationResult {
    return this.validateString(phone, {
      pattern: VALIDATION_PATTERNS.phone,
      maxLength: 20,
      fieldName: 'Téléphone'
    })
  }

  static validateUsername(username: string): ValidationResult {
    return this.validateString(username, {
      pattern: VALIDATION_PATTERNS.username,
      minLength: 3,
      maxLength: 30,
      fieldName: 'Nom d\'utilisateur'
    })
  }

  static validateProjectId(projectId: string): ValidationResult {
    return this.validateString(projectId, {
      pattern: VALIDATION_PATTERNS.projectId,
      fieldName: 'ID Projet'
    })
  }

  static validateReportId(reportId: string): ValidationResult {
    return this.validateString(reportId, {
      pattern: VALIDATION_PATTERNS.reportId,
      fieldName: 'ID Rapport'
    })
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = []
    let risk: ValidationResult['risk'] = 'low'

    if (password.length < 8) {
      errors.push('Mot de passe trop court (min: 8 caractères)')
      risk = 'high'
    }

    if (password.length > 128) {
      errors.push('Mot de passe trop long (max: 128 caractères)')
      risk = 'medium'
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Doit contenir au moins une minuscule')
      risk = 'medium'
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Doit contenir au moins une majuscule')
      risk = 'medium'
    }

    if (!/\d/.test(password)) {
      errors.push('Doit contenir au moins un chiffre')
      risk = 'medium'
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Doit contenir au moins un caractère spécial')
      risk = 'medium'
    }

    // Vérifier les mots de passe communs
    const commonPasswords = ['password', '123456', 'admin', 'root', 'user', 'test']
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Mot de passe trop commun')
      risk = 'high'
    }

    return {
      isValid: errors.length === 0,
      errors,
      risk
    }
  }

  // Validation d'un objet complet
  static validateObject(
    obj: Record<string, any>,
    schema: Record<string, {
      required?: boolean
      type: 'string' | 'number' | 'email' | 'phone' | 'username' | 'password'
      minLength?: number
      maxLength?: number
      pattern?: RegExp
    }>,
    request?: NextRequest
  ): { isValid: boolean; errors: Record<string, string[]>; sanitized: Record<string, any> } {
    const errors: Record<string, string[]> = {}
    const sanitized: Record<string, any> = {}
    let hasErrors = false
    let highestRisk: ValidationResult['risk'] = 'low'

    for (const [field, rules] of Object.entries(schema)) {
      const value = obj[field]
      
      // Vérifier si requis
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = [`${field} est requis`]
        hasErrors = true
        continue
      }

      // Si pas requis et vide, passer
      if (!rules.required && (value === undefined || value === null || value === '')) {
        sanitized[field] = value
        continue
      }

      // Validation selon le type
      let result: ValidationResult
      
      switch (rules.type) {
        case 'email':
          result = this.validateEmail(value)
          break
        case 'phone':
          result = this.validatePhone(value)
          break
        case 'username':
          result = this.validateUsername(value)
          break
        case 'password':
          result = this.validatePassword(value)
          break
        case 'string':
          result = this.validateString(value, {
            minLength: rules.minLength,
            maxLength: rules.maxLength,
            pattern: rules.pattern,
            fieldName: field
          })
          break
        case 'number':
          const num = Number(value)
          result = {
            isValid: !isNaN(num) && isFinite(num),
            errors: isNaN(num) ? [`${field} doit être un nombre`] : [],
            sanitized: num.toString(),
            risk: 'low'
          }
          break
        default:
          result = { isValid: true, errors: [], risk: 'low' }
      }

      if (!result.isValid) {
        errors[field] = result.errors
        hasErrors = true
      }

      if (result.risk === 'critical' || result.risk === 'high') {
        highestRisk = result.risk
      }

      sanitized[field] = result.sanitized || value
    }

    // Logger les tentatives d'injection si détectées
    if (highestRisk === 'critical' && request) {
      logSecurityViolation('input_validation_failed', request, {
        fields: Object.keys(errors),
        risk: highestRisk
      })
    }

    return {
      isValid: !hasErrors,
      errors,
      sanitized
    }
  }
}

// Helper functions pour usage facile
export const validateEmail = (email: string) => InputValidator.validateEmail(email)
export const validatePhone = (phone: string) => InputValidator.validatePhone(phone)
export const validateUsername = (username: string) => InputValidator.validateUsername(username)
export const validatePassword = (password: string) => InputValidator.validatePassword(password)
export const validateProjectId = (projectId: string) => InputValidator.validateProjectId(projectId)
export const validateReportId = (reportId: string) => InputValidator.validateReportId(reportId)