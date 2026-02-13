import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Trash2, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { formatCLP, formatDate } from '../utils/format'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

export default function TransactionsPage() {
  const { accounts, categories } = useStore()
  const [txs, setTxs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(0)
  const LIMIT = 30
  const [filters, setFilters] = useState({ search:'', type:'', account_id:'', from:'', to:'' })
  const [form, setForm] = useState({ account_id:'', category_id:'', type:'expense', amount:'', description:'', merchant:'', date: new Date().toISOString().slice(0,10), to_account_id:'' })

  async function loadTxs(p = 0) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: p * LIMIT, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) })
      const d = await api.get('/api/transactions?' + params)
      setTxs(p === 0 ? d.data : [...txs, ...d.data])
      setTotal(d.total)
      setPage(p)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadTxs(0) }, [filters])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/transactions', form)
      toast.success('Movimiento registrado')
      setModal(false)
      loadTxs(0)
    } catch { } finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await api.delete('/api/transactions/' + id)
    toast.success('Movimiento eliminado')
    loadTxs(0)
  }

  const ingresos = txs.filter(t=>t.type==='income').reduce((s,t)=>s+parseFloat(t.amount),0)
  const gastos = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+parseFloat(t.amount),0)

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Movimientos</h1>
          <p className="text-slate-500 text-sm">{total} registros</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={16}/> Agregar</Button>
      </div>

      {/* Mini summary */}
      <div className="grid grid-cols-3 gap-3">
        {[['Ingresos','text-green-400',ingresos],['Gastos','text-red-400',gastos],['Neto',ingresos-gastos>=0?'text-white':'text-red-400',ingresos-gastos]].map(([l,cls,v])=>(
          <div key={l} className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">{l}</p>
            <p className={`text-base font-bold num ${cls}`}>{formatCLP(v)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <Input placeholder="Buscar..." prefix={<Search size={12} />}
            value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <Select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="min-w-32">
          <option value="">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
          <option value="transfer">Transferencias</option>
        </Select>
        <Select value={filters.account_id} onChange={e => setFilters({...filters, account_id: e.target.value})} className="min-w-36">
          <option value="">Todas cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} />
        <Input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} />
        <Button variant="ghost" onClick={() => setFilters({ search:'', type:'', account_id:'', from:'', to:'' })}>Limpiar</Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                {['Fecha','Descripción','Categoría','Cuenta','Monto',''].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-surface-700/30 transition-colors group">
                  <td className="px-4 py-3 text-xs text-slate-500 num whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white">{tx.description || tx.merchant || '—'}</p>
                    {tx.merchant && tx.description && <p className="text-xs text-slate-600">{tx.merchant}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {tx.category_name && (
                      <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${tx.category_color||'#6366f1'}25`, color: tx.category_color||'#6366f1' }}>
                        {tx.category_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{tx.account_name}</td>
                  <td className="px-4 py-3 text-sm font-semibold num whitespace-nowrap">
                    <span className={tx.type==='income' ? 'text-green-400' : tx.type==='expense' ? 'text-red-400' : 'text-blue-400'}>
                      {tx.type==='income' ? '+' : tx.type==='expense' ? '-' : '⇄'}{formatCLP(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(tx.id)}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && txs.length < total && (
            <div className="flex justify-center py-4">
              <Button variant="secondary" onClick={() => loadTxs(page + 1)}>Cargar más</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo movimiento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {['income','expense','transfer'].map(t => (
              <button key={t} type="button" onClick={() => setForm({...form, type: t})}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${form.type===t
                  ? t==='income' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : t==='expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-surface-700 text-slate-400 hover:bg-surface-600'}`}>
                {t==='income' ? 'Ingreso' : t==='expense' ? 'Gasto' : 'Transferencia'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cuenta" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})} required>
              <option value="">Selecciona cuenta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Input label="Monto" type="number" prefix="$" placeholder="0"
              value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
            <Input label="Fecha" type="date" value={form.date}
              onChange={e => setForm({...form, date: e.target.value})} />
            <Select label="Categoría" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">Sin categoría</option>
              {categories.filter(c => c.type===form.type || c.type==='transfer').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <div className="col-span-2">
              <Input label="Descripción" placeholder="ej: Compra supermercado"
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <Input label="Comercio / Establecimiento" placeholder="ej: Jumbo"
              value={form.merchant} onChange={e => setForm({...form, merchant: e.target.value})} />
            {form.type==='transfer' && (
              <Select label="Cuenta destino" value={form.to_account_id} onChange={e => setForm({...form, to_account_id: e.target.value})}>
                <option value="">Cuenta destino</option>
                {accounts.filter(a => a.id!==form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}