import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Calculator, FileText, Receipt, Calendar, Settings, TrendingUp, DollarSign } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { formatCLP, formatDate, formatPct } from '../utils/format'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Card from '../components/ui/Card'

const TABS = [
  { id: 'config', label: 'Configuración', icon: Settings },
  { id: 'boletas', label: 'Boletas Honorarios', icon: Receipt },
  { id: 'facturas', label: 'Facturas IVA', icon: FileText },
  { id: 'ppm', label: 'PPM', icon: Calendar },
  { id: 'calc', label: 'Calculadoras', icon: Calculator },
  { id: 'summary', label: 'Resumen Anual', icon: TrendingUp },
]

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function TaxPage() {
  const [tab, setTab] = useState('config')
  const [config, setConfig] = useState(null)
  const [data, setData] = useState({ boletas: [], facturas: [], ppm: [] })
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  async function loadConfig() {
    try {
      const cfg = await api.get('/api/tax/config')
      setConfig(cfg)
    } catch {}
  }

  async function loadData() {
    const [bol, fac, ppm] = await Promise.all([
      api.get(`/api/tax/boletas?year=${year}`),
      api.get(`/api/tax/facturas?year=${year}`),
      api.get(`/api/tax/ppm?year=${year}`)
    ])
    setData({ boletas: bol, facturas: fac, ppm })
  }

  useEffect(() => { loadConfig() }, [])
  useEffect(() => { loadData() }, [year])

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Tributación / SII</h1>
        <p className="text-slate-500 text-sm">Gestión de impuestos, boletas de honorarios, facturas y PPM</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab===id ? 'bg-brand-600 text-white shadow-glow' : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Year selector (for data tabs) */}
      {['boletas','facturas','ppm','summary'].includes(tab) && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Año:</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {tab === 'config' && <ConfigTab config={config} reload={loadConfig} />}
      {tab === 'boletas' && <BoletasTab data={data.boletas} year={year} reload={loadData} config={config} />}
      {tab === 'facturas' && <FacturasTab data={data.facturas} year={year} reload={loadData} />}
      {tab === 'ppm' && <PPMTab data={data.ppm} year={year} reload={loadData} />}
      {tab === 'calc' && <CalcTab config={config} />}
      {tab === 'summary' && <SummaryTab year={year} />}
    </div>
  )
}

// ── Config Tab ──
function ConfigTab({ config, reload }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    rut: '', tax_regime: 'honorarios', company_name: '', company_rut: '', giro: '',
    retencion_pct: 11.5, exempt_amount: 0, iva_registered: false, monthly_target: 0, notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (config) {
      setForm({
        rut: config.rut || '',
        tax_regime: config.tax_regime || 'honorarios',
        company_name: config.company_name || '',
        company_rut: config.company_rut || '',
        giro: config.giro || '',
        retencion_pct: config.retencion_pct || 11.5,
        exempt_amount: config.exempt_amount || 0,
        iva_registered: config.iva_registered || false,
        monthly_target: config.monthly_target || 0,
        notes: config.notes || ''
      })
    }
  }, [config])

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/api/tax/config', form)
      toast.success('Configuración guardada')
      setEditing(false); reload()
    } catch {} finally { setLoading(false) }
  }

  if (!editing && config) {
    return (
      <Card className="max-w-3xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Configuración Tributaria</h3>
          <Button size="sm" onClick={() => setEditing(true)}>Editar</Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">RUT:</span> <span className="text-white ml-2">{config.rut || '—'}</span></div>
          <div><span className="text-slate-500">Régimen:</span> <span className="text-white ml-2 capitalize">{config.tax_regime}</span></div>
          {config.company_name && (
            <>
              <div><span className="text-slate-500">Empresa:</span> <span className="text-white ml-2">{config.company_name}</span></div>
              <div><span className="text-slate-500">RUT Empresa:</span> <span className="text-white ml-2">{config.company_rut}</span></div>
            </>
          )}
          <div><span className="text-slate-500">Retención %:</span> <span className="text-white ml-2">{config.retencion_pct}%</span></div>
          <div><span className="text-slate-500">Registrado IVA:</span> <span className="text-white ml-2">{config.iva_registered ? 'Sí' : 'No'}</span></div>
          <div><span className="text-slate-500">Meta mensual:</span> <span className="text-white ml-2">{formatCLP(config.monthly_target)}</span></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="max-w-3xl">
      <h3 className="font-semibold text-white mb-5">
        {config ? 'Editar Configuración' : 'Configuración Inicial'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="RUT" placeholder="12.345.678-9" value={form.rut}
            onChange={e => setForm({...form, rut: e.target.value})} />
          <Select label="Régimen tributario" value={form.tax_regime}
            onChange={e => setForm({...form, tax_regime: e.target.value})}>
            <option value="honorarios">Boletas de Honorarios</option>
            <option value="empresa">Empresa (Primera Categoría)</option>
            <option value="hibrido">Híbrido</option>
          </Select>

          {form.tax_regime !== 'honorarios' && (
            <>
              <Input label="Nombre empresa" value={form.company_name}
                onChange={e => setForm({...form, company_name: e.target.value})} />
              <Input label="RUT empresa" value={form.company_rut}
                onChange={e => setForm({...form, company_rut: e.target.value})} />
              <div className="col-span-2">
                <Input label="Giro comercial" value={form.giro}
                  onChange={e => setForm({...form, giro: e.target.value})} />
              </div>
            </>
          )}

          <Input label="% Retención honorarios" type="number" step="0.1" suffix="%"
            value={form.retencion_pct} onChange={e => setForm({...form, retencion_pct: e.target.value})} />
          <Input label="Meta ingresos mensual" type="number" prefix="$"
            value={form.monthly_target} onChange={e => setForm({...form, monthly_target: e.target.value})} />

          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.iva_registered}
              onChange={e => setForm({...form, iva_registered: e.target.checked})} className="rounded" />
            <label className="text-sm text-slate-300">Estoy registrado como contribuyente de IVA</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {config && (
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            {config ? 'Guardar cambios' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ── Boletas Honorarios Tab ──
function BoletasTab({ data, year, reload, config }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    folio: '', type: 'emitida', client_rut: '', client_name: '',
    date: new Date().toISOString().slice(0,10), amount_bruto: '',
    retencion_pct: config?.retencion_pct || 11.5, description: '', status: 'emitida',
    payment_date: '', notes: ''
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/api/tax/boletas', form)
      toast.success('Boleta registrada')
      setModal(false); reload()
      setForm({
        folio: '', type: 'emitida', client_rut: '', client_name: '',
        date: new Date().toISOString().slice(0,10), amount_bruto: '',
        retencion_pct: config?.retencion_pct || 11.5, description: '', status: 'emitida',
        payment_date: '', notes: ''
      })
    } catch {} finally { setLoading(false) }
  }

  const totalBruto = data.reduce((s,b) => s + parseFloat(b.amount_bruto || 0), 0)
  const totalRetenido = data.reduce((s,b) => s + parseFloat(b.retencion_monto || 0), 0)
  const totalLiquido = data.reduce((s,b) => s + parseFloat(b.amount_liquido || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Total bruto</p>
            <p className="text-lg font-bold text-white num">{formatCLP(totalBruto)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Retenciones</p>
            <p className="text-lg font-bold text-red-400 num">-{formatCLP(totalRetenido)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Total líquido</p>
            <p className="text-lg font-bold text-green-400 num">{formatCLP(totalLiquido)}</p>
          </div>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nueva boleta</Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                {['Folio','Tipo','Cliente','Fecha','Bruto','Retención','Líquido','Estado',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {data.map(b => (
                <tr key={b.id} className="hover:bg-surface-700/30 transition-colors group">
                  <td className="px-4 py-3 text-white font-mono">{b.folio || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${b.type==='emitida' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{b.client_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 num">{formatDate(b.date)}</td>
                  <td className="px-4 py-3 text-white num font-semibold">{formatCLP(b.amount_bruto)}</td>
                  <td className="px-4 py-3 text-red-400 num">-{formatCLP(b.retencion_monto)}</td>
                  <td className="px-4 py-3 text-green-400 num font-semibold">{formatCLP(b.amount_liquido)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${b.status==='pagada' ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { await api.delete('/api/tax/boletas/'+b.id); reload() }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 rounded-lg transition-all">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
              {!data.length && (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">Sin boletas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Boleta de Honorarios">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Folio" placeholder="123456" value={form.folio}
              onChange={e => setForm({...form, folio: e.target.value})} />
            <Select label="Tipo" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="emitida">Emitida (yo emito)</option>
              <option value="recibida">Recibida (yo recibo)</option>
            </Select>
            <Input label="RUT Cliente" placeholder="12.345.678-9" value={form.client_rut}
              onChange={e => setForm({...form, client_rut: e.target.value})} />
            <Input label="Nombre Cliente" value={form.client_name}
              onChange={e => setForm({...form, client_name: e.target.value})} />
            <Input label="Fecha" type="date" value={form.date}
              onChange={e => setForm({...form, date: e.target.value})} required />
            <Input label="Monto bruto" type="number" prefix="$" value={form.amount_bruto}
              onChange={e => setForm({...form, amount_bruto: e.target.value})} required />
            <Input label="% Retención" type="number" step="0.1" suffix="%" value={form.retencion_pct}
              onChange={e => setForm({...form, retencion_pct: e.target.value})} />
            <Select label="Estado" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="emitida">Emitida</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </Select>
            {form.status === 'pagada' && (
              <Input label="Fecha de pago" type="date" value={form.payment_date}
                onChange={e => setForm({...form, payment_date: e.target.value})} />
            )}
            <div className="col-span-2">
              <Input label="Descripción / Concepto" value={form.description}
                onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Facturas IVA Tab ──
function FacturasTab({ data, year, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    type: 'compra', folio: '', provider_rut: '', provider_name: '',
    date: new Date().toISOString().slice(0,10), amount_neto: '',
    description: '', category: '', status: 'vigente', payment_date: '', notes: ''
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/api/tax/facturas', form)
      toast.success('Factura registrada')
      setModal(false); reload()
      setForm({
        type: 'compra', folio: '', provider_rut: '', provider_name: '',
        date: new Date().toISOString().slice(0,10), amount_neto: '',
        description: '', category: '', status: 'vigente', payment_date: '', notes: ''
      })
    } catch {} finally { setLoading(false) }
  }

  const compras = data.filter(f => f.type === 'compra')
  const ventas = data.filter(f => f.type === 'venta')
  const ivaCompras = compras.reduce((s,f) => s + parseFloat(f.iva || 0), 0)
  const ivaVentas = ventas.reduce((s,f) => s + parseFloat(f.iva || 0), 0)
  const ivaPagar = Math.max(0, ivaVentas - ivaCompras)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">IVA Débito (Ventas)</p>
            <p className="text-lg font-bold text-red-400 num">{formatCLP(ivaVentas)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">IVA Crédito (Compras)</p>
            <p className="text-lg font-bold text-green-400 num">{formatCLP(ivaCompras)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">IVA a Pagar</p>
            <p className={`text-lg font-bold num ${ivaPagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCLP(ivaPagar)}
            </p>
          </div>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nueva factura</Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-surface-700">
              <tr>
                {['Tipo','Folio','Proveedor/Cliente','Fecha','Neto','IVA','Total','Estado',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {data.map(f => (
                <tr key={f.id} className="hover:bg-surface-700/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${f.type==='compra' ? 'bg-orange-500/15 text-orange-400' : 'bg-green-500/15 text-green-400'}`}>
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-mono">{f.folio || '—'}</td>
                  <td className="px-4 py-3 text-white">{f.provider_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 num">{formatDate(f.date)}</td>
                  <td className="px-4 py-3 text-white num">{formatCLP(f.amount_neto)}</td>
                  <td className="px-4 py-3 text-slate-400 num">{formatCLP(f.iva)}</td>
                  <td className="px-4 py-3 text-white num font-semibold">{formatCLP(f.amount_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-lg ${f.status==='pagada' ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { await api.delete('/api/tax/facturas/'+f.id); reload() }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 rounded-lg transition-all">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
              {!data.length && (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">Sin facturas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Factura">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="compra">Compra (gasto)</option>
              <option value="venta">Venta (ingreso)</option>
            </Select>
            <Input label="Folio" placeholder="123456" value={form.folio}
              onChange={e => setForm({...form, folio: e.target.value})} />
            <Input label="RUT Proveedor/Cliente" placeholder="12.345.678-9" value={form.provider_rut}
              onChange={e => setForm({...form, provider_rut: e.target.value})} />
            <Input label="Nombre Proveedor/Cliente" value={form.provider_name}
              onChange={e => setForm({...form, provider_name: e.target.value})} />
            <Input label="Fecha" type="date" value={form.date}
              onChange={e => setForm({...form, date: e.target.value})} required />
            <Input label="Monto neto" type="number" prefix="$" value={form.amount_neto}
              onChange={e => setForm({...form, amount_neto: e.target.value})} required />
            <Input label="Categoría" placeholder="Servicios, productos..." value={form.category}
              onChange={e => setForm({...form, category: e.target.value})} />
            <Select label="Estado" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="vigente">Vigente</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </Select>
            <div className="col-span-2">
              <Input label="Descripción" value={form.description}
                onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── PPM Tab ──
function PPMTab({ data, year, reload }) {
  const [modal, setModal] = useState(false)
  const [editMonth, setEditMonth] = useState(null)
  const [form, setForm] = useState({
    year, month: new Date().getMonth() + 1, income_period: '', expenses_period: '',
    ppm_paid: '', payment_date: '', f29_folio: '', status: 'pendiente', notes: ''
  })
  const [loading, setLoading] = useState(false)

  function openEdit(month) {
    const existing = data.find(p => p.month === month)
    if (existing) {
      setForm({
        year, month, income_period: existing.income_period || '',
        expenses_period: existing.expenses_period || '', ppm_paid: existing.ppm_paid || '',
        payment_date: existing.payment_date || '', f29_folio: existing.f29_folio || '',
        status: existing.status, notes: existing.notes || ''
      })
    } else {
      setForm({
        year, month, income_period: '', expenses_period: '', ppm_paid: '',
        payment_date: '', f29_folio: '', status: 'pendiente', notes: ''
      })
    }
    setEditMonth(month)
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/api/tax/ppm', form)
      toast.success('PPM registrado')
      setModal(false); reload()
    } catch {} finally { setLoading(false) }
  }

  const totalPaid = data.reduce((s, p) => s + parseFloat(p.ppm_paid || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Total PPM pagado {year}</p>
          <p className="text-lg font-bold text-white num">{formatCLP(totalPaid)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {MONTHS.map((name, idx) => {
          const monthNum = idx + 1
          const ppm = data.find(p => p.month === monthNum)
          const isPaid = ppm?.status === 'pagado'
          const isPending = !ppm || ppm.status === 'pendiente'

          return (
            <motion.button
              key={monthNum}
              onClick={() => openEdit(monthNum)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`glass glass-hover rounded-2xl p-4 text-left transition-all
                ${isPaid ? 'border-l-2 border-green-500' : isPending ? 'border-l-2 border-slate-600' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-white">{name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-lg
                  ${isPaid ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'}`}>
                  {ppm?.status || 'pendiente'}
                </span>
              </div>
              {ppm && (
                <>
                  <p className="text-xs text-slate-500">PPM pagado:</p>
                  <p className="text-lg font-bold text-white num">{formatCLP(ppm.ppm_paid || 0)}</p>
                  {ppm.base_imponible > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Base: {formatCLP(ppm.base_imponible)}
                    </p>
                  )}
                </>
              )}
              {!ppm && <p className="text-slate-600 text-xs mt-2">Click para registrar</p>}
            </motion.button>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={`PPM ${MONTHS[editMonth - 1]} ${year}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ingresos del período" type="number" prefix="$" value={form.income_period}
              onChange={e => setForm({...form, income_period: e.target.value})} />
            <Input label="Gastos deducibles" type="number" prefix="$" value={form.expenses_period}
              onChange={e => setForm({...form, expenses_period: e.target.value})} />
            <Input label="PPM pagado" type="number" prefix="$" value={form.ppm_paid}
              onChange={e => setForm({...form, ppm_paid: e.target.value})} />
            <Input label="Fecha de pago" type="date" value={form.payment_date}
              onChange={e => setForm({...form, payment_date: e.target.value})} />
            <Input label="Folio F29" placeholder="123456789" value={form.f29_folio}
              onChange={e => setForm({...form, f29_folio: e.target.value})} />
            <Select label="Estado" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="exento">Exento</option>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Calculadoras Tab ──
function CalcTab({ config }) {
  const [mode, setMode] = useState('renta')
  const [form, setForm] = useState({
    // Renta
    income_annual: '', deductions: '',
    // Boleta
    amount_bruto: '', retencion_pct: config?.retencion_pct || 11.5,
    // IVA
    amount: '', type: 'neto'
  })
  const [result, setResult] = useState(null)

  async function calc() {
    try {
      if (mode === 'renta') {
        const r = await api.post('/api/tax/calc/renta', {
          income_annual: form.income_annual, deductions: form.deductions
        })
        setResult({ type: 'renta', ...r })
      } else if (mode === 'boleta') {
        const r = await api.post('/api/tax/calc/boleta', {
          amount_bruto: form.amount_bruto, retencion_pct: form.retencion_pct
        })
        setResult({ type: 'boleta', ...r })
      } else if (mode === 'iva') {
        const r = await api.post('/api/tax/calc/iva', {
          amount: form.amount, type: form.type
        })
        setResult({ type: 'iva', ...r })
      }
    } catch {}
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex gap-2">
        {[['renta','Impuesto a la Renta'],['boleta','Boleta Honorarios'],['iva','IVA']].map(([m,l]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${mode===m ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
          {mode === 'renta' && (
            <>
              <Input label="Ingresos anuales" type="number" prefix="$" value={form.income_annual}
                onChange={e => setForm({...form, income_annual: e.target.value})} />
              <Input label="Deducciones / Gastos" type="number" prefix="$" value={form.deductions}
                onChange={e => setForm({...form, deductions: e.target.value})} />
            </>
          )}
          {mode === 'boleta' && (
            <>
              <Input label="Monto bruto" type="number" prefix="$" value={form.amount_bruto}
                onChange={e => setForm({...form, amount_bruto: e.target.value})} />
              <Input label="% Retención" type="number" step="0.1" suffix="%" value={form.retencion_pct}
                onChange={e => setForm({...form, retencion_pct: e.target.value})} />
            </>
          )}
          {mode === 'iva' && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({...form, type: 'neto'})}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${form.type==='neto' ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400'}`}>
                  Tengo el Neto
                </button>
                <button type="button" onClick={() => setForm({...form, type: 'bruto'})}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${form.type==='bruto' ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400'}`}>
                  Tengo el Total
                </button>
              </div>
              <Input label={form.type === 'neto' ? 'Monto neto' : 'Monto total'} type="number" prefix="$"
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </>
          )}
          <Button onClick={calc} className="w-full">Calcular</Button>
        </div>
      </Card>

      {result && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="glass rounded-2xl p-5 border border-brand-500/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Resultado</h3>
          {result.type === 'renta' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Ingresos anuales</span>
                <span className="text-white num">{formatCLP(result.income_annual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Deducciones</span>
                <span className="text-red-400 num">-{formatCLP(result.deductions)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-surface-600 pt-2">
                <span className="text-slate-400">Base imponible</span>
                <span className="text-white num font-semibold">{formatCLP(result.base_imponible)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-surface-600 pt-2">
                <span className="text-white font-semibold">Impuesto a pagar</span>
                <span className="text-red-400 num font-bold">{formatCLP(result.impuesto_calculado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tasa efectiva</span>
                <span className="text-white">{result.tasa_efectiva}%</span>
              </div>
              <div className="flex justify-between text-sm border-t border-surface-600 pt-2">
                <span className="text-white font-semibold">Ingreso líquido anual</span>
                <span className="text-green-400 num font-bold">{formatCLP(result.income_liquido)}</span>
              </div>
            </div>
          )}
          {result.type === 'boleta' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monto bruto</span>
                <span className="text-white num">{formatCLP(result.amount_bruto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Retención ({result.retencion_pct}%)</span>
                <span className="text-red-400 num">-{formatCLP(result.retencion_monto)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-surface-600 pt-2">
                <span className="text-white font-semibold">Monto líquido a recibir</span>
                <span className="text-green-400 num font-bold">{formatCLP(result.amount_liquido)}</span>
              </div>
            </div>
          )}
          {result.type === 'iva' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Neto</span>
                <span className="text-white num">{formatCLP(result.neto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">IVA (19%)</span>
                <span className="text-orange-400 num">{formatCLP(result.iva)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-surface-600 pt-2">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white num font-bold">{formatCLP(result.bruto)}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ── Summary Tab ──
function SummaryTab({ year }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const d = await api.get(`/api/tax/summary/${year}`)
        setData(d)
      } finally { setLoading(false) }
    }
    load()
  }, [year])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 max-w-4xl">
      <Card>
        <h3 className="text-lg font-bold text-white mb-4">Resumen Tributario {year}</h3>
        
        {/* Honorarios */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Boletas de Honorarios
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Total bruto</p>
              <p className="text-xl font-bold text-white num">
                {formatCLP(data?.honorarios?.total_bruto || 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Retenciones</p>
              <p className="text-xl font-bold text-red-400 num">
                {formatCLP(data?.honorarios?.total_retenido || 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Cantidad boletas</p>
              <p className="text-xl font-bold text-white num">{data?.honorarios?.cantidad || 0}</p>
            </div>
          </div>
        </div>

        {/* IVA */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            IVA
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Débito (Ventas)</p>
              <p className="text-lg font-bold text-red-400 num">
                {formatCLP(data?.iva?.iva_debito || 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Crédito (Compras)</p>
              <p className="text-lg font-bold text-green-400 num">
                {formatCLP(data?.iva?.iva_credito || 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4 col-span-2 border-l-2 border-brand-500">
              <p className="text-xs text-slate-500">IVA a Pagar</p>
              <p className="text-2xl font-bold text-white num">
                {formatCLP(data?.iva?.iva_a_pagar || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* PPM */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Pagos Provisionales Mensuales
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Total PPM pagado</p>
              <p className="text-xl font-bold text-white num">
                {formatCLP(data?.ppm?.total_pagado || 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500">Meses declarados</p>
              <p className="text-xl font-bold text-white num">{data?.ppm?.meses_declarados || 0}/12</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-400">
            💡 Este resumen es informativo. Consúltalo con tu contador antes de la Operación Renta.
            Los cálculos son aproximados y pueden variar según tu situación específica.
          </p>
        </div>
      </Card>
    </div>
  )
}
