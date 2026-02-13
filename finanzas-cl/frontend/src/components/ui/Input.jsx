import { clsx } from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, prefix, suffix, className = '', ...props }, ref) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-slate-500 text-sm pointer-events-none">{prefix}</span>}
        <input ref={ref} {...props}
          className={clsx(
            'w-full bg-surface-700 border border-surface-600 rounded-xl text-white placeholder:text-slate-600',
            'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-colors',
            'text-sm py-2.5',
            prefix ? 'pl-8' : 'pl-3',
            suffix ? 'pr-8' : 'pr-3',
            error && 'border-red-500 focus:border-red-500',
            className
          )} />
        {suffix && <span className="absolute right-3 text-slate-500 text-sm pointer-events-none">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
})

export default Input