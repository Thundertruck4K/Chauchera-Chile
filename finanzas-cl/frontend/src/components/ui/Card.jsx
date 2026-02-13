import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export default function Card({ children, className = '', hover = false, glow = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={clsx(
        'glass rounded-2xl p-5',
        hover && 'glass-hover cursor-pointer transition-all duration-200',
        glow && 'shadow-glow',
        className
      )}>
      {children}
    </motion.div>
  )
}