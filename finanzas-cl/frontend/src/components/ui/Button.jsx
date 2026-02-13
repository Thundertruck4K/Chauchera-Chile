import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export default function Button({ children, variant = 'primary', size = 'md', className = '', loading = false, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white btn-glow',
    secondary: 'bg-surface-700 hover:bg-surface-600 text-white border border-surface-600',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30',
    ghost: 'hover:bg-surface-700 text-slate-400 hover:text-white',
    success: 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <motion.button whileTap={{ scale: 0.97 }}
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </motion.button>
  )
}