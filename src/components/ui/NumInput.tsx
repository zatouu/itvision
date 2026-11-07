'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'

type NumInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'defaultValue'> & {
  value: number | null | undefined
  /** `undefined` quand le champ est vide : au parent de choisir le défaut (à l'enregistrement, pas à la frappe). */
  onChange: (value: number | undefined) => void
  /** Valeur affichée comme un champ vide (ex. 0 pour une quantité facultative). */
  emptyValue?: number
  /** Nombres entiers uniquement (quantités, jours…). */
  integer?: boolean
}

const parse = (text: string, integer?: boolean): number | undefined => {
  const normalized = text.replace(/\s/g, '').replace(',', '.')
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return undefined
  const n = integer ? parseInt(normalized, 10) : Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Champ numérique piloté par le texte saisi : on peut tout effacer (le 0 ne revient pas),
 * taper « 2,5 » ou « 2.5 », et le curseur ne saute pas. Le texte n'est réécrit que si la
 * valeur change de l'extérieur (calcul automatique, préremplissage d'import…).
 */
const NumInput = forwardRef<HTMLInputElement, NumInputProps>(function NumInput(
  { value, onChange, emptyValue, integer, inputMode, ...rest },
  ref,
) {
  const toText = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) || (emptyValue !== undefined && v === emptyValue) ? '' : String(v)
  const [text, setText] = useState(() => toText(value))
  const lastEmitted = useRef<number | undefined>(parse(text, integer))

  useEffect(() => {
    const external = value == null || !Number.isFinite(value) ? undefined : value
    // Écho de notre propre saisie : ne jamais réécrire le texte (« 0 » pour taper « 0,5 »…)
    if (external === lastEmitted.current) return
    // Champ vidé que le parent stocke sous sa valeur « vide » (ex. 0) : même chose
    if (emptyValue !== undefined && external === emptyValue && lastEmitted.current === undefined) return
    lastEmitted.current = external
    setText(toText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, emptyValue])

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={inputMode ?? (integer ? 'numeric' : 'decimal')}
      value={text}
      onChange={e => {
        const raw = e.target.value
        // Caractères numériques uniquement (signe, séparateur décimal, espaces de milliers)
        if (!/^-?[\d\s]*([.,]\d*)?$/.test(raw)) return
        if (integer && /[.,]/.test(raw)) return
        setText(raw)
        const parsed = parse(raw, integer)
        lastEmitted.current = parsed
        onChange(parsed)
      }}
    />
  )
})

export default NumInput
