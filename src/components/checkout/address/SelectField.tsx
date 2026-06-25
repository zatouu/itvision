import { ChevronDown } from 'lucide-react'

interface SelectFieldProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  error?: string
}

export default function SelectField({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Sélectionner...',
  error,
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-ddm-emerald/30 focus:border-ddm-emerald ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-white'} ${error ? 'border-red-500' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
