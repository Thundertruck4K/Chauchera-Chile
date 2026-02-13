import { forwardRef } from 'react'
import { clsx } from 'clsx'

const Select = forwardRef(function Select({ label, error, className = '', children, ...props }, ref) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>}
      <select ref={ref} {...props}
        className={clsx(
          'w-full bg-surface-700 border border-surface-600 rounded-xl text-white',
          'focus:outline-none focus:border-brand-500 transition-colors',
          'text-sm px-3 py-2.5 cursor-pointer',
          error && 'border-red-500',
          className
        )}>
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
})

export default Select