'use client'

import { useCallback, useRef, useState, type ReactNode, type KeyboardEvent, type DragEvent } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'

export interface FileDropZoneProps {
  onFiles: (files: File[]) => void | Promise<void>
  /** Même syntaxe que l'attribut accept : "image/*,.pdf,application/pdf" */
  accept?: string
  multiple?: boolean
  disabled?: boolean
  busy?: boolean
  maxSizeMb?: number
  maxFiles?: number
  label?: string
  hint?: string
  /** Variante compacte (une ligne) pour les barres d'outils et formulaires. */
  compact?: boolean
  /** Ouvre directement l'appareil photo sur mobile. */
  capture?: 'environment' | 'user'
  className?: string
  onError?: (message: string) => void
  /** Si fourni, le contenu existant devient la cible du dépôt (superposition pendant le survol). */
  children?: ReactNode
  /** Contenu de la superposition en mode enveloppe. */
  overlayLabel?: string
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(rule => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

export default function FileDropZone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  maxSizeMb,
  maxFiles,
  label,
  hint,
  compact = false,
  capture,
  className = '',
  onError,
  children,
  overlayLabel = 'Déposez le fichier ici',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const depth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const inactive = disabled || busy

  const report = useCallback((message: string) => {
    if (onError) onError(message)
    else if (typeof window !== 'undefined') window.alert(message)
  }, [onError])

  const handleFiles = useCallback((list: FileList | File[] | null | undefined) => {
    if (inactive || !list) return
    let files = Array.from(list)
    if (files.length === 0) return
    const rejectedType = files.filter(f => !matchesAccept(f, accept))
    if (rejectedType.length) report(`Format non accepté : ${rejectedType.map(f => f.name).join(', ')}`)
    files = files.filter(f => matchesAccept(f, accept))
    if (maxSizeMb) {
      const tooBig = files.filter(f => f.size > maxSizeMb * 1024 * 1024)
      if (tooBig.length) report(`Fichier trop volumineux (${maxSizeMb} Mo max) : ${tooBig.map(f => f.name).join(', ')}`)
      files = files.filter(f => f.size <= maxSizeMb * 1024 * 1024)
    }
    if (!multiple) files = files.slice(0, 1)
    if (maxFiles !== undefined) files = files.slice(0, Math.max(0, maxFiles))
    if (files.length) void onFiles(files)
  }, [inactive, accept, maxSizeMb, multiple, maxFiles, onFiles, report])

  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    depth.current += 1
    if (!inactive) setDragging(true)
  }
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = inactive ? 'none' : 'copy'
  }
  const onDragLeave = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    depth.current = 0
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }
  const dropHandlers = { onDragEnter, onDragOver, onDragLeave, onDrop }

  const open = () => { if (!inactive) inputRef.current?.click() }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept={accept}
      multiple={multiple}
      capture={capture}
      disabled={inactive}
      onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
    />
  )

  if (children !== undefined) {
    return (
      <div className={`relative ${className}`} {...dropHandlers}>
        {children}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 p-3 text-center text-sm font-semibold text-blue-700">
            <UploadCloud className="mr-2 h-5 w-5 flex-shrink-0" />{overlayLabel}
          </div>
        )}
      </div>
    )
  }

  const base = dragging
    ? 'border-blue-500 bg-blue-50 text-blue-700'
    : 'border-stone-300 bg-white text-stone-600 hover:border-blue-400 hover:bg-blue-50/40'

  return (
    <div
      role="button"
      tabIndex={inactive ? -1 : 0}
      aria-disabled={inactive}
      onClick={open}
      onKeyDown={onKey}
      {...dropHandlers}
      className={`border-2 border-dashed rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${base} ${inactive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${compact ? 'flex items-center gap-2 px-3 py-2 text-sm' : 'flex flex-col items-center justify-center gap-1 px-4 py-6 text-center'} ${className}`}
    >
      {input}
      {busy
        ? <Loader2 className={`${compact ? 'h-4 w-4' : 'h-7 w-7'} animate-spin text-blue-600`} />
        : <UploadCloud className={`${compact ? 'h-4 w-4' : 'h-7 w-7'} ${dragging ? 'text-blue-600' : 'text-stone-400'}`} />}
      <span className={compact ? 'min-w-0 truncate font-medium' : 'text-sm font-medium'}>
        {busy ? 'Envoi en cours…' : label || (multiple ? 'Glissez vos fichiers ici ou cliquez pour parcourir' : 'Glissez un fichier ici ou cliquez pour parcourir')}
      </span>
      {!compact && hint && <span className="text-xs text-stone-500">{hint}</span>}
    </div>
  )
}
