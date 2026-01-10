'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import DOMPurify from 'isomorphic-dompurify'
import {
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  AlertTriangle,
  Quote
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface ProductRichDescriptionProps {
  /** Contenu HTML brut de la description */
  html?: string | null
  /** Contenu Markdown (alternatif au HTML) */
  markdown?: string | null
  /** Liste de spécifications clés à mettre en avant */
  highlights?: string[]
  /** Note/avertissement à afficher */
  notice?: {
    type: 'info' | 'warning' | 'success' | 'tip'
    message: string
  }
  /** Témoignage/citation à afficher */
  testimonial?: {
    text: string
    author: string
    role?: string
  }
  /** Mode compact (moins de padding) */
  compact?: boolean
  /** Classe CSS additionnelle */
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sanitise le HTML pour éviter les attaques XSS
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'b', 'em', 'i', 'u', 's', 'mark',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'div', 'span',
      'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'title', 'width', 'height',
      'class', 'style'
    ],
    ALLOW_DATA_ATTR: false
  })
}

/**
 * Transforme le HTML pour améliorer l'affichage
 * - Ajoute des classes Tailwind aux éléments
 * - Améliore les liens pour ouvrir dans un nouvel onglet
 */
function enhanceHtml(html: string): string {
  // Créer un DOM virtuel pour manipuler le HTML
  if (typeof window === 'undefined') return html
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Améliorer les liens
  doc.querySelectorAll('a').forEach(link => {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
    link.classList.add('text-emerald-600', 'hover:text-emerald-700', 'underline')
  })
  
  // Améliorer les images
  doc.querySelectorAll('img').forEach(img => {
    img.classList.add('rounded-lg', 'shadow-md', 'my-4', 'max-w-full', 'h-auto')
  })
  
  // Améliorer les tableaux
  doc.querySelectorAll('table').forEach(table => {
    table.classList.add('min-w-full', 'divide-y', 'divide-gray-200', 'border', 'border-gray-200', 'rounded-lg', 'overflow-hidden')
  })
  
  doc.querySelectorAll('th').forEach(th => {
    th.classList.add('px-4', 'py-3', 'bg-gray-50', 'text-left', 'text-xs', 'font-semibold', 'text-gray-600', 'uppercase')
  })
  
  doc.querySelectorAll('td').forEach(td => {
    td.classList.add('px-4', 'py-3', 'text-sm', 'text-gray-700', 'border-t', 'border-gray-100')
  })
  
  // Améliorer les blockquotes
  doc.querySelectorAll('blockquote').forEach(quote => {
    quote.classList.add('border-l-4', 'border-emerald-500', 'pl-4', 'py-2', 'my-4', 'bg-emerald-50', 'rounded-r-lg', 'italic', 'text-gray-700')
  })
  
  // Améliorer les listes
  doc.querySelectorAll('ul').forEach(ul => {
    ul.classList.add('list-disc', 'list-inside', 'space-y-2', 'text-gray-700')
  })
  
  doc.querySelectorAll('ol').forEach(ol => {
    ol.classList.add('list-decimal', 'list-inside', 'space-y-2', 'text-gray-700')
  })
  
  return doc.body.innerHTML
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

interface NoticeProps {
  type: 'info' | 'warning' | 'success' | 'tip'
  message: string
}

function Notice({ type, message }: NoticeProps) {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      iconColor: 'text-blue-500'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconColor: 'text-amber-500'
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      iconColor: 'text-emerald-500'
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      iconColor: 'text-purple-500'
    }
  }
  
  const c = config[type]
  const Icon = c.icon
  
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border', c.bg, c.border)}>
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', c.iconColor)} />
      <p className={clsx('text-sm', c.text)}>{message}</p>
    </div>
  )
}

interface TestimonialProps {
  text: string
  author: string
  role?: string
}

function Testimonial({ text, author, role }: TestimonialProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
      <Quote className="absolute top-4 left-4 w-8 h-8 text-gray-200" />
      <blockquote className="relative z-10 pl-8">
        <p className="text-gray-700 italic text-lg leading-relaxed mb-4">
          &ldquo;{text}&rdquo;
        </p>
        <footer className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            {author.charAt(0).toUpperCase()}
          </div>
          <div>
            <cite className="font-semibold text-gray-900 not-italic">{author}</cite>
            {role && <p className="text-sm text-gray-500">{role}</p>}
          </div>
        </footer>
      </blockquote>
    </div>
  )
}

interface HighlightsProps {
  items: string[]
}

function Highlights({ items }: HighlightsProps) {
  if (items.length === 0) return null
  
  return (
    <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
      <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
        <CheckCircle className="w-5 h-5" />
        Points clés du produit
      </h4>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductRichDescription({
  html,
  markdown,
  highlights,
  notice,
  testimonial,
  compact,
  className
}: ProductRichDescriptionProps) {
  // Contenu HTML sécurisé et amélioré
  const safeHtml = useMemo(() => {
    if (!html && !markdown) return null
    
    const rawHtml = html || markdown || ''
    const sanitized = sanitizeHtml(rawHtml)
    
    // Améliorer côté client uniquement
    if (typeof window !== 'undefined') {
      return enhanceHtml(sanitized)
    }
    
    return sanitized
  }, [html, markdown])

  // Si aucun contenu
  if (!safeHtml && !highlights?.length && !notice && !testimonial) {
    return (
      <div className={clsx('text-center py-8', className)}>
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 italic">
          Description détaillée disponible sur demande auprès de nos équipes sourcing.
        </p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6', compact && 'space-y-4', className)}>
      {/* Points clés en premier */}
      {highlights && highlights.length > 0 && (
        <Highlights items={highlights} />
      )}

      {/* Notice/Avertissement */}
      {notice && <Notice type={notice.type} message={notice.message} />}

      {/* Contenu principal */}
      {safeHtml && (
        <div
          className={clsx(
            'prose prose-emerald max-w-none',
            'prose-headings:text-gray-800 prose-headings:font-bold',
            'prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4',
            'prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3',
            'prose-p:text-gray-700 prose-p:leading-relaxed',
            'prose-li:text-gray-700',
            'prose-strong:text-gray-800',
            'prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline',
            compact && 'prose-sm'
          )}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}

      {/* Témoignage en dernier */}
      {testimonial && (
        <Testimonial
          text={testimonial.text}
          author={testimonial.author}
          role={testimonial.role}
        />
      )}
    </div>
  )
}
