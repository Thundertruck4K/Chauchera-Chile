import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'

export default function StatCard({ label, value, sub, trend, icon: Icon, color = 'brand', delay = 0 }) {
  const colors = {
    brand: 'from-brand-600/20 to-brand-800/10 border-brand-500/20',
    green: 'from-green-600/20 to-green-800/10 border-green-500/20',
    red: 'from-red-600/20 to-red-800/10 border-red-500/20',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-500/20',
    orange: 'from-orange-600/20 to-orange-800/10 border-orange-500/20',
  }
  const iconColors = { brand: 'text-brand-400', green: 'text-green-400', red: 'text-red-400', purple: 'text-purple-400', orange: 'text-orange-400' }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}
      className={clsx('rounded-2xl border bg-gradient-to-br p-5', colors[color])}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        {Icon && <div className={clsx('p-2 rounded-lg bg-surface-700', iconColors[color])}><Icon size={16} /></div>}
      </div>
      <p className="text-2xl font-bold text-white num tracking-tight mb-1">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {trend !== undefined && (
        <div className={clsx('flex items-center gap-1 text-xs mt-2', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(trend).toFixed(1)}% vs mes anterior</span>
        </div>
      )}
    </motion.div>
  )
}