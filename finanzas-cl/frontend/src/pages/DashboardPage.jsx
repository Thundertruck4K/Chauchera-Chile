import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../utils/api'
import { formatCLP, formatDate, relativeTime } from '../utils/format'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import { useStore } from '../store/useStore'

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const accounts = useStore(s => s.accounts)

  async function load() {
    setLoading(true)
    try {
      const d = await api.get(`/api/dashboard/summary?month=${month}`)
      setData(d)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const trendData = (data?.monthly_trend || []).map(r => ({
    name: MONTH_NAMES[new Date(r.month).getMonth()],
    Ingresos: parseFloat(r.income),
    Gastos: parseFloat(r.expense)
  }))

  const catData = (data?.top_categories || []).map(c => ({
    name: c.name, value: parseFloat(c.total), color: c.color || '#6366f1'
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass rounded-xl p-3 border border-brand-500/20 text-xs">
        <p className="text-slate-400 mb-2 font-medium">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCLP(p.value, { compact: true })}
          </p>
        ))}
      </div>
    )
  }

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Cargando...</span>
      </div>
    </div>
  )

  const net = (data?.month_income || 0) - (data?.month_expense || 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Resumen financiero</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
          <button onClick={load} className="p-2 rounded-xl bg-surface-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Patrimonio total" value={formatCLP(data?.total_balance)} icon={Wallet} color="brand" delay={0} />
        <StatCard label="Ingresos del mes" value={formatCLP(data?.month_income)} icon={TrendingUp} color="green" delay={0.05} />
        <StatCard label="Gastos del mes" value={formatCLP(data?.month_expense)} icon={TrendingDown} color="red" delay={0.1} />
        <StatCard label="Balance neto" value={formatCLP(net)} icon={BarChart3} color={net >= 0 ? 'green' : 'red'} delay={0.15} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend */}
        <Card className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Tendencia 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCLP(v, { compact: true })} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" strokeWidth={2} fill="url(#gIn)" />
              <Area type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} fill="url(#gOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Categories pie */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Gastos por categoría</h3>
          {catData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} strokeWidth={0}>
                    {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCLP(v)} contentStyle={{ background: '#1a2236', border: '1px solid rgba(91,123,245,0.3)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {catData.slice(0,5).map((c,i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-slate-400 truncate max-w-24">{c.name}</span>
                    </div>
                    <span className="text-slate-300 num">{formatCLP(c.value, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-slate-500 text-sm text-center py-8">Sin datos para este mes</p>}
        </Card>
      </div>

      {/* Accounts + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Accounts */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Mis cuentas</h3>
          <div className="space-y-2">
            {accounts.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Sin cuentas registradas</p>}
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl hover:bg-surface-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: acc.color || '#6366f1' }}>
                    {acc.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{acc.name}</p>
                    <p className="text-xs text-slate-500">{acc.bank_name || 'Sin banco'} · {acc.type_name}</p>
                  </div>
                </div>
                <span className={`text-sm num font-semibold ${parseFloat(acc.balance) < 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatCLP(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent transactions */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Últimos movimientos</h3>
          <div className="space-y-2">
            {(data?.recent_transactions || []).length === 0 && <p className="text-slate-500 text-sm text-center py-4">Sin movimientos</p>}
            {(data?.recent_transactions || []).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl hover:bg-surface-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: `${tx.category_color || '#6366f1'}20` }}>
                    {tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '⇄'}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{tx.description || tx.merchant || 'Sin descripción'}</p>
                    <p className="text-xs text-slate-500">{tx.account_name} · {formatDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`text-sm num font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCLP(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}