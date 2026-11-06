interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export default function TextareaField({ label, error, className = '', ...props }: TextareaFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <textarea
        {...props}
        className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ddm-emerald/30 focus:border-ddm-emerald resize-none ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
