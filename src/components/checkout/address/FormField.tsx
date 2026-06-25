import { LucideIcon } from 'lucide-react'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  label: string
  hint?: string
  prefix?: string
  error?: string
}

export default function FormField({ icon: Icon, label, hint, prefix, error, className = '', ...props }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">{prefix}</span>
        )}
        <input
          {...props}
          className={`w-full ${prefix ? 'pl-12' : 'pl-3'} pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ddm-emerald/30 focus:border-ddm-emerald ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
