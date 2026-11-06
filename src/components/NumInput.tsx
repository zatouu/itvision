'use client'

import { useEffect, useState } from 'react'

type NumInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | undefined
  onChange: (v: number | undefined) => void
  // Valeur affichée comme vide (ex: 0 pour une quantité). Permet à l'utilisateur
  // de tout effacer puis retaper sans que le défaut ne réapparaisse.
  emptyValue?: number
}

// Champ numérique piloté par du texte brut : l'utilisateur peut tout effacer
// puis retaper (y compris des décimales "2.5"). La valeur remontée au parent
// reste un number | undefined ; le texte local n'est réécrit que lorsque la
// valeur change de l'extérieur (calcul automatique, préfill...).
export default function NumInput({ value, onChange, emptyValue, ...rest }: NumInputProps) {
  const blank = (v: number | undefined) =>
    v == null || !Number.isFinite(v) || (emptyValue !== undefined && v === emptyValue)
  const [text, setText] = useState(blank(value) ? '' : String(value))
  const typed = text === '' ? undefined : Number(text)

  useEffect(() => {
    const expected = emptyValue !== undefined && value === emptyValue ? undefined : value
    if (expected !== typed) setText(blank(value) ? '' : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, emptyValue])

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onChange={e => {
        const t = e.target.value
        setText(t)
        onChange(t === '' ? undefined : Number(t))
      }}
    />
  )
}
