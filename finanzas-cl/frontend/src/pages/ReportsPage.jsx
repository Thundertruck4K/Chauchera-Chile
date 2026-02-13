import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, FileText, Printer } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../utils/api'
import { formatCLP, formatDate } from '../utils/format'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rangeMode, setRangeMode] = useState('month') // 'month' | 'custom'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

async function load() {
  setLoading(true)
  try {
    let params = ''
    if (rangeMode === 'month') {
      params = `month=${month}`
    } else {
      if (!dateFrom || !dateTo) {
        toast.error('Debes seleccionar ambas fechas')
        setLoading(false)
        return
      }
      params = `from=${dateFrom}&to=${dateTo}`
    }
    const d = await api.get(`/api/reports/monthly?${params}`)
    setData(d)
  } catch {} finally { setLoading(false) }
}
  useEffect(() => { load() }, [month, rangeMode, dateFrom, dateTo])  // ← Agregar dependencias

  function printReport() { window.print() }

  const catExpense = (data?.by_category || []).filter(c => c.type === 'expense')
  const catIncome = (data?.by_category || []).filter(c => c.type === 'income')
  

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
<div className="flex items-center justify-between no-print">
  <div>
    <h1 className="text-2xl font-bold text-white">Reportes</h1>
    <p className="text-slate-500 text-sm">Análisis financiero</p>
  </div>
  <div className="flex gap-3 items-center flex-wrap">
    {/* Selector de modo */}
    <div className="flex gap-1 bg-surface-800 rounded-xl p-1">
      <button
        onClick={() => setRangeMode('month')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${rangeMode === 'month' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
      >
        Por mes
      </button>
      <button
        onClick={() => setRangeMode('custom')}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${rangeMode === 'custom' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
      >
        Rango personalizado
      </button>
    </div>

    {/* Selector según modo */}
    {rangeMode === 'month' ? (
      <input
        type="month"
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
      />
    ) : (
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          placeholder="Desde"
        />
        <span className="text-slate-500 text-xs">hasta</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          placeholder="Hasta"
        />
      </div>
    )}

    <Button variant="secondary" onClick={load} loading={loading}>
      Generar
    </Button>
    <Button variant="secondary" onClick={printReport}>
      <Printer size={15}/> Imprimir
    </Button>
  </div>
</div>

      {loading && !data && <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      {data && (
        <div id="report-content" className="space-y-5">
          {/* Print header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-3xl font-bold">FinanzasCL – Reporte Mensual</h1>
            <p className="text-gray-600 mt-1">Período: {month} · {data.user?.name}</p>
          </div>

          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Ingresos', formatCLP(data.income), 'text-green-400', 'border-green-500'],
              ['Gastos', formatCLP(data.expense), 'text-red-400', 'border-red-500'],
              ['Balance neto', formatCLP(data.net), data.net >= 0 ? 'text-white' : 'text-red-400', data.net >= 0 ? 'border-brand-500' : 'border-red-500'],
            ].map(([l, v, cls, border]) => (
              <div key={l} className={`glass rounded-2xl p-5 border-l-2 ${border}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{l}</p>
                <p className={`text-2xl font-bold num ${cls}`}>{v}</p>
              </div>
            ))}
          </div>

          {/* By category */}
          <div className="grid xl:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Gastos por categoría</h3>
              {catExpense.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={catExpense} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => formatCLP(v, { compact: true })} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} axisLine={false} />
                      <Tooltip formatter={(v) => formatCLP(v)} contentStyle={{ background: '#1a2236', border: '1px solid rgba(91,123,245,0.3)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="total" radius={[0,4,4,0]}>
                        {catExpense.map((c,i) => <Cell key={i} fill={c.color || '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {catExpense.map((c,i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                          <span className="text-slate-400">{c.name}</span>
                        </div>
                        <span className="text-slate-300 num">{formatCLP(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-slate-500 text-sm text-center py-6">Sin gastos este mes</p>}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Ingresos por categoría</h3>
              {catIncome.length > 0 ? (
                <div className="space-y-2">
                  {catIncome.map((c,i) => {
                    const pct = data.income > 0 ? (c.total / data.income * 100) : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{c.name}</span>
                          <span className="text-white num">{formatCLP(c.total)}</span>
                        </div>
                        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color || '#22c55e' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-slate-500 text-sm text-center py-6">Sin ingresos registrados</p>}
            </Card>
          </div>

          {/* By account */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Movimientos por cuenta</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left py-2 text-xs text-slate-500 font-medium">Cuenta</th>
                    <th className="text-right py-2 text-xs text-slate-500 font-medium">Ingresos</th>
                    <th className="text-right py-2 text-xs text-slate-500 font-medium">Gastos</th>
                    <th className="text-right py-2 text-xs text-slate-500 font-medium">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {(data.by_account || []).map((a,i) => (
                    <tr key={i}>
                      <td className="py-2 text-white font-medium">{a.name}</td>
                      <td className="py-2 text-right text-green-400 num">{formatCLP(a.income)}</td>
                      <td className="py-2 text-right text-red-400 num">{formatCLP(a.expense)}</td>
                      <td className={`py-2 text-right num font-semibold ${parseFloat(a.income)-parseFloat(a.expense) >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {formatCLP(parseFloat(a.income)-parseFloat(a.expense))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-center py-2 text-xs text-slate-600 no-print">
            Generado: {formatDate(data.generated_at, 'dd/MM/yyyy')} · FinanzasCL
          </div>
        </div>
      )}
    </div>
  )
}