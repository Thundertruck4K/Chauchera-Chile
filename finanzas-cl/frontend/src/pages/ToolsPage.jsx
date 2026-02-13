import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Calculator, TrendingUp, Target, CreditCard, Shield, Building2 } from 'lucide-react'
import api from '../utils/api'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'
import { formatCLP, formatDate, formatPct, daysBetween } from '../utils/format'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Card from '../components/ui/Card'

const TABS = [
  { id: 'deposits', label: 'Depósitos a Plazo', icon: Building2 },
  { id: 'savings', label: 'Metas de Ahorro', icon: Target },
  { id: 'credits', label: 'Créditos', icon: CreditCard },
  { id: 'pension', label: 'AFP', icon: Shield },
  { id: 'mutual-funds', label: 'Fondos Mutuos', icon: TrendingUp },
  { id: 'stocks', label: 'Acciones', icon: TrendingUp },
  { id: 'apv', label: 'APV', icon: Shield },
  { id: 'calc', label: 'Calculadora', icon: Calculator },
]

export default function ToolsPage() {
  const [tab, setTab] = useState('deposits')
  const { banks, accounts } = useStore()
  const [data, setData] = useState({ deposits:[], savings:[], credits:[], pension:[], mutualFunds:[], stocks:[], apv:[] })
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(false)

  async function loadAll() {
    const [dep, sav, cre, pen, mf, stk, apv] = await Promise.all([
      api.get('/api/tools/deposits'),
      api.get('/api/tools/savings'),
      api.get('/api/tools/credits'),
      api.get('/api/tools/pension'),
      api.get('/api/tools/mutual-funds'),
      api.get('/api/tools/stocks'),
      api.get('/api/tools/apv'),
    ])
    setData({ deposits: dep, savings: sav, credits: cre, pension: pen, mutualFunds: mf, stocks: stk, apv: apv })
  }
  useEffect(() => { loadAll() }, [])

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Herramientas Financieras</h1>
        <p className="text-slate-500 text-sm">Depósitos, ahorros, créditos y previsión</p>
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

      {/* Deposits */}
      {tab === 'deposits' && <DepositsTab data={data.deposits} banks={banks} accounts={accounts} reload={loadAll} />}
      {tab === 'savings' && <SavingsTab data={data.savings} accounts={accounts} reload={loadAll} />}
      {tab === 'credits' && <CreditsTab data={data.credits} banks={banks} reload={loadAll} />}
      {tab === 'pension' && <PensionTab data={data.pension} reload={loadAll} />}
      {tab === 'mutual-funds' && <MutualFundsTab data={data.mutualFunds} reload={loadAll} />}
      {tab === 'stocks' && <StocksTab data={data.stocks} reload={loadAll} />}
      {tab === 'apv' && <APVTab data={data.apv} reload={loadAll} />}
      {tab === 'calc' && <CalcTab />}
    </div>
  )
}

// ── Deposits ──
function DepositsTab({ data, banks, accounts, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ bank_id:'', name:'DAP', principal:'', rate_pct:'', start_date: new Date().toISOString().slice(0,10), end_date:'', renewal_mode:'capital', notes:'' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/tools/deposits', form)
      toast.success('Depósito registrado')
      setModal(false); reload()
    } catch {} finally { setLoading(false) }
  }

  const totalInvested = data.reduce((s,d)=>s+parseFloat(d.principal),0)
  const totalFinal = data.reduce((s,d)=>s+parseFloat(d.final_amount||d.principal),0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Invertido</p>
            <p className="text-lg font-bold text-white num">{formatCLP(totalInvested)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Al vencimiento</p>
            <p className="text-lg font-bold text-green-400 num">{formatCLP(totalFinal)}</p>
          </div>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nuevo DAP</Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((d, i) => {
          const days = daysBetween(d.start_date, d.end_date)
          const daysLeft = daysBetween(new Date().toISOString().slice(0,10), d.end_date)
          const progress = Math.max(0, Math.min(100, ((days - daysLeft) / days) * 100))
          return (
            <motion.div key={d.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
              className="glass glass-hover rounded-2xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-white">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.bank_name || 'Sin banco'}</p>
                </div>
                <button onClick={async () => { await api.delete('/api/tools/deposits/'+d.id); reload() }}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 size={13}/>
                </button>
              </div>
              <p className="text-2xl font-bold text-white num">{formatCLP(d.principal)}</p>
              <p className="text-sm text-green-400 num">{formatCLP(d.final_amount)} al vencer</p>
              <div className="my-3 flex justify-between text-xs text-slate-500">
                <span>Tasa: <span className="text-white">{formatPct(d.rate_pct)}</span></span>
                <span>{daysLeft > 0 ? `${daysLeft} días restantes` : 'Vencido'}</span>
              </div>
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>{formatDate(d.start_date)}</span>
                <span>{formatDate(d.end_date)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Depósito a Plazo">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Banco" value={form.bank_id} onChange={e => setForm({...form, bank_id: e.target.value})}>
              <option value="">Selecciona banco</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Input label="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <Input label="Capital" type="number" prefix="$" value={form.principal}
              onChange={e => setForm({...form, principal: e.target.value})} required />
            <Input label="Tasa anual %" type="number" step="0.01" suffix="%" value={form.rate_pct}
              onChange={e => setForm({...form, rate_pct: e.target.value})} required />
            <Input label="Fecha inicio" type="date" value={form.start_date}
              onChange={e => setForm({...form, start_date: e.target.value})} />
            <Input label="Fecha vencimiento" type="date" value={form.end_date}
              onChange={e => setForm({...form, end_date: e.target.value})} required />
            <Select label="Al vencer" value={form.renewal_mode} onChange={e => setForm({...form, renewal_mode: e.target.value})} className="col-span-2">
              <option value="capital">Renovar solo capital</option>
              <option value="capital_interest">Renovar capital + intereses</option>
              <option value="manual">Renovación manual</option>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Savings Goals ──
function SavingsTab({ data, accounts, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', target_amount:'', current_amount:0, target_date:'', color:'#22c55e', icon:'target' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/savings', form); toast.success('Meta creada'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nueva meta</Button>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((g, i) => {
          const pct = Math.min(100, (g.current_amount / g.target_amount) * 100)
          return (
            <motion.div key={g.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
              className="glass glass-hover rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${g.color}25` }}>
                  🎯
                </div>
                <div>
                  <p className="font-semibold text-white">{g.name}</p>
                  {g.target_date && <p className="text-xs text-slate-500">Meta: {formatDate(g.target_date)}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white num font-bold">{formatCLP(g.current_amount)}</span>
                  <span className="text-slate-400 num">{formatCLP(g.target_amount)}</span>
                </div>
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{pct.toFixed(1)}% alcanzado</span>
                  <span>Faltan {formatCLP(g.target_amount - g.current_amount)}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Nueva meta de ahorro">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nombre de la meta" placeholder="ej: Viaje a Europa" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto objetivo" type="number" prefix="$" value={form.target_amount}
              onChange={e => setForm({...form, target_amount: e.target.value})} required />
            <Input label="Ahorrado hasta ahora" type="number" prefix="$" value={form.current_amount}
              onChange={e => setForm({...form, current_amount: e.target.value})} />
            <Input label="Fecha objetivo" type="date" value={form.target_date}
              onChange={e => setForm({...form, target_date: e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Crear meta</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Credits ──
function CreditsTab({ data, banks, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ bank_id:'', name:'', credit_type:'consumo', total_amount:'', pending_amount:'', rate_pct:'', monthly_payment:'', total_fees:'', paid_fees:0, next_payment_date:'' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/credits', form); toast.success('Crédito registrado'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  const totalDebt = data.reduce((s,c)=>s+parseFloat(c.pending_amount),0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Deuda total</p>
          <p className="text-lg font-bold text-red-400 num">{formatCLP(totalDebt)}</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nuevo crédito</Button>
      </div>

      <div className="space-y-3">
        {data.map((c, i) => {
          const pct = c.total_fees ? Math.min(100, (c.paid_fees / c.total_fees) * 100) : 0
          return (
            <motion.div key={c.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
              className="glass glass-hover rounded-2xl p-5 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white">{c.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-red-500/15 text-red-400">{c.credit_type}</span>
                </div>
                <p className="text-xs text-slate-500">{c.bank_name || 'Sin banco'} {c.rate_pct ? `· ${formatPct(c.rate_pct)} TAE` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-400 num">{formatCLP(c.pending_amount)}</p>
                {c.monthly_payment && <p className="text-xs text-slate-500">Cuota: {formatCLP(c.monthly_payment)}/mes</p>}
              </div>
              {c.total_fees && (
                <div className="w-full">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{c.paid_fees}/{c.total_fees} cuotas</span>
                    <span>{pct.toFixed(0)}% pagado</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo crédito / préstamo">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Banco" value={form.bank_id} onChange={e => setForm({...form, bank_id: e.target.value})}>
              <option value="">Sin banco</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="Tipo" value={form.credit_type} onChange={e => setForm({...form, credit_type: e.target.value})}>
              <option value="consumo">Consumo</option>
              <option value="hipotecario">Hipotecario</option>
              <option value="automotriz">Automotriz</option>
              <option value="linea_credito">Línea de crédito</option>
              <option value="otro">Otro</option>
            </Select>
            <div className="col-span-2"><Input label="Nombre / descripción" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <Input label="Monto total" type="number" prefix="$" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} required />
            <Input label="Deuda pendiente" type="number" prefix="$" value={form.pending_amount} onChange={e => setForm({...form, pending_amount: e.target.value})} required />
            <Input label="Tasa anual %" type="number" step="0.01" suffix="%" value={form.rate_pct} onChange={e => setForm({...form, rate_pct: e.target.value})} />
            <Input label="Cuota mensual" type="number" prefix="$" value={form.monthly_payment} onChange={e => setForm({...form, monthly_payment: e.target.value})} />
            <Input label="Total cuotas" type="number" value={form.total_fees} onChange={e => setForm({...form, total_fees: e.target.value})} />
            <Input label="Cuotas pagadas" type="number" value={form.paid_fees} onChange={e => setForm({...form, paid_fees: e.target.value})} />
            <Input label="Próximo pago" type="date" value={form.next_payment_date} onChange={e => setForm({...form, next_payment_date: e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Pension ──
function PensionTab({ data, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ afp_name:'', fund_type:'B', balance_obligatorio:0, balance_voluntario:0, last_updated: new Date().toISOString().slice(0,10), notes:'' })
  const [loading, setLoading] = useState(false)
  const AFPS = ['AFP Capital','AFP Cuprum','AFP Habitat','AFP Modelo','AFP PlanVital','AFP ProVida']

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/pension', form); toast.success('AFP registrada'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal(true)}><Plus size={15}/> Registrar AFP</Button>
      </div>
      {data.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.05 }}
          className="glass glass-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-white text-lg">{p.afp_name}</p>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-400">Fondo {p.fund_type}</span>
            </div>
            <p className="text-2xl font-bold text-white num">{formatCLP(parseFloat(p.balance_obligatorio)+parseFloat(p.balance_voluntario))}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Obligatorio</p>
              <p className="text-white num font-semibold">{formatCLP(p.balance_obligatorio)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">APV / Voluntario</p>
              <p className="text-green-400 num font-semibold">{formatCLP(p.balance_voluntario)}</p>
            </div>
          </div>
          {p.last_updated && <p className="text-xs text-slate-600 mt-2">Actualizado: {formatDate(p.last_updated)}</p>}
        </motion.div>
      ))}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar AFP">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="AFP" value={form.afp_name} onChange={e => setForm({...form, afp_name: e.target.value})} required>
              <option value="">Selecciona AFP</option>
              {AFPS.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Select label="Tipo de fondo" value={form.fund_type} onChange={e => setForm({...form, fund_type: e.target.value})}>
              {['A','B','C','D','E'].map(f => <option key={f} value={f}>Fondo {f}</option>)}
            </Select>
            <Input label="Saldo obligatorio" type="number" prefix="$" value={form.balance_obligatorio} onChange={e => setForm({...form, balance_obligatorio: e.target.value})} />
            <Input label="APV / Voluntario" type="number" prefix="$" value={form.balance_voluntario} onChange={e => setForm({...form, balance_voluntario: e.target.value})} />
            <Input label="Fecha de saldo" type="date" value={form.last_updated} onChange={e => setForm({...form, last_updated: e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Fondos Mutuos ──
function MutualFundsTab({ data, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ fund_name:'', fund_type:'renta_variable', manager:'', series:'', shares:0, value_per_share:0, total_invested:0, last_updated: new Date().toISOString().slice(0,10), notes:'' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/mutual-funds', form); toast.success('Fondo registrado'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  const totalInvested = data.reduce((s,f)=>s+parseFloat(f.total_invested||0),0)
  const totalCurrent = data.reduce((s,f)=>s+parseFloat(f.current_value||0),0)
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Invertido</p>
            <p className="text-lg font-bold text-white num">{formatCLP(totalInvested)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Valor actual</p>
            <p className={`text-lg font-bold num ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCLP(totalCurrent)}
            </p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Rentabilidad</p>
            <p className={`text-lg font-bold num ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nuevo fondo</Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((f,i) => {
          const ret = parseFloat(f.return_pct || 0)
          return (
            <motion.div key={f.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              className="glass glass-hover rounded-2xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-white">{f.fund_name}</p>
                  <p className="text-xs text-slate-500">{f.manager} {f.series && `· Serie ${f.series}`}</p>
                </div>
                <button onClick={async()=>{await api.delete('/api/tools/mutual-funds/'+f.id);reload()}}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 size={13}/>
                </button>
              </div>
              <p className="text-2xl font-bold text-white num">{formatCLP(f.current_value)}</p>
              <p className={`text-sm num ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {ret >= 0 ? '+' : ''}{ret.toFixed(2)}% · {f.shares} cuotas
              </p>
              <div className="mt-3 text-xs text-slate-500">
                Invertido: <span className="text-white">{formatCLP(f.total_invested)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo Fondo Mutuo">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nombre del fondo" placeholder="ej: Banchile Acciones Chile Serie A" value={form.fund_name} onChange={e=>setForm({...form,fund_name:e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.fund_type} onChange={e=>setForm({...form,fund_type:e.target.value})}>
              <option value="renta_variable">Renta Variable</option>
              <option value="renta_fija">Renta Fija</option>
              <option value="mixto">Mixto</option>
              <option value="monetario">Monetario</option>
            </Select>
            <Input label="Serie" placeholder="A, B, APV..." value={form.series} onChange={e=>setForm({...form,series:e.target.value})} />
            <Input label="Administradora (AGF)" placeholder="ej: Banchile AGF" value={form.manager} onChange={e=>setForm({...form,manager:e.target.value})} />
            <Input label="Cuotas" type="number" step="0.000001" value={form.shares} onChange={e=>setForm({...form,shares:e.target.value})} />
            <Input label="Valor cuota" type="number" step="0.0001" prefix="$" value={form.value_per_share} onChange={e=>setForm({...form,value_per_share:e.target.value})} />
            <Input label="Total invertido" type="number" prefix="$" value={form.total_invested} onChange={e=>setForm({...form,total_invested:e.target.value})} />
            <Input label="Última actualización" type="date" value={form.last_updated} onChange={e=>setForm({...form,last_updated:e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={()=>setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Acciones ──
function StocksTab({ data, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ticker:'', company_name:'', market:'Chile', shares:0, avg_price:0, current_price:0, broker:'', last_updated: new Date().toISOString().slice(0,10), notes:'' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/stocks', form); toast.success('Acción registrada'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  const totalInvested = data.reduce((s,st)=>s+parseFloat(st.total_invested||0),0)
  const totalCurrent = data.reduce((s,st)=>s+parseFloat(st.current_value||0),0)
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Invertido</p>
            <p className="text-lg font-bold text-white num">{formatCLP(totalInvested)}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Valor actual</p>
            <p className={`text-lg font-bold num ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCLP(totalCurrent)}
            </p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">Rentabilidad</p>
            <p className={`text-lg font-bold num ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nueva acción</Button>
      </div>

      <div className="space-y-2">
        {data.map((st,i) => {
          const ret = parseFloat(st.return_pct || 0)
          return (
            <motion.div key={st.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
              className="glass glass-hover rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-white font-mono">{st.ticker}</p>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400">{st.market}</span>
                </div>
                <p className="text-xs text-slate-500">{st.company_name || 'Sin nombre'} · {st.shares} acciones</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold num ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCLP(st.current_value)}
                </p>
                <p className={`text-xs num ${ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                </p>
              </div>
              <button onClick={async()=>{await api.delete('/api/tools/stocks/'+st.id);reload()}}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                <Trash2 size={14}/>
              </button>
            </motion.div>
          )
        })}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Nueva Acción">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ticker / Nemotécnico" placeholder="CMPC, SQM-B, AAPL" value={form.ticker} onChange={e=>setForm({...form,ticker:e.target.value.toUpperCase()})} required />
            <Input label="Empresa" placeholder="ej: Banco de Chile" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})} />
            <Select label="Mercado" value={form.market} onChange={e=>setForm({...form,market:e.target.value})}>
              <option value="Chile">Chile</option>
              <option value="USA">Estados Unidos</option>
              <option value="otros">Otros</option>
            </Select>
            <Input label="Corredora" placeholder="ej: Santander" value={form.broker} onChange={e=>setForm({...form,broker:e.target.value})} />
            <Input label="Cantidad acciones" type="number" step="0.01" value={form.shares} onChange={e=>setForm({...form,shares:e.target.value})} required />
            <Input label="Precio promedio compra" type="number" step="0.01" prefix="$" value={form.avg_price} onChange={e=>setForm({...form,avg_price:e.target.value})} required />
            <Input label="Precio actual" type="number" step="0.01" prefix="$" value={form.current_price} onChange={e=>setForm({...form,current_price:e.target.value})} />
            <Input label="Última actualización" type="date" value={form.last_updated} onChange={e=>setForm({...form,last_updated:e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={()=>setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── APV ──
function APVTab({ data, reload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ institution:'', plan_type:'A', balance:0, monthly_contribution:0, tax_benefit:'57bis', last_updated: new Date().toISOString().slice(0,10), notes:'' })
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/api/tools/apv', form); toast.success('APV registrado'); setModal(false); reload() }
    catch {} finally { setLoading(false) }
  }

  const totalBalance = data.reduce((s,a)=>s+parseFloat(a.balance||0),0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Total APV</p>
          <p className="text-lg font-bold text-white num">{formatCLP(totalBalance)}</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={15}/> Nuevo APV</Button>
      </div>

      {data.map((a,i) => (
        <motion.div key={a.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.05}}
          className="glass glass-hover rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-white text-lg">{a.institution}</p>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-400">
                Régimen {a.plan_type} · {a.tax_benefit === '57bis' ? 'Art. 57 bis' : 'Sin beneficio'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white num">{formatCLP(a.balance)}</p>
          </div>
          {a.monthly_contribution > 0 && (
            <p className="text-sm text-slate-400">Aporte mensual: {formatCLP(a.monthly_contribution)}</p>
          )}
        </motion.div>
      ))}

      <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo APV">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Institución" placeholder="AFP, Banco, Compañía de Seguros" value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})} required />
            <Select label="Régimen" value={form.plan_type} onChange={e=>setForm({...form,plan_type:e.target.value})}>
              <option value="A">Régimen A (empleador)</option>
              <option value="B">Régimen B (individual)</option>
            </Select>
            <Select label="Beneficio tributario" value={form.tax_benefit} onChange={e=>setForm({...form,tax_benefit:e.target.value})}>
              <option value="57bis">Art. 57 bis (rebaja impuestos)</option>
              <option value="no_benefit">Sin beneficio</option>
            </Select>
            <Input label="Saldo actual" type="number" prefix="$" value={form.balance} onChange={e=>setForm({...form,balance:e.target.value})} />
            <Input label="Aporte mensual" type="number" prefix="$" value={form.monthly_contribution} onChange={e=>setForm({...form,monthly_contribution:e.target.value})} />
            <Input label="Última actualización" type="date" value={form.last_updated} onChange={e=>setForm({...form,last_updated:e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={()=>setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Calculator ──
function CalcTab() {
  const [mode, setMode] = useState('deposit')
  const [form, setForm] = useState({ principal:1000000, rate_pct:4.5, days:90, amount:5000000, months:60 })
  const [result, setResult] = useState(null)

  async function calc() {
    try {
      if (mode === 'deposit') {
        const r = await api.post('/api/tools/calc/deposit', { principal: form.principal, rate_pct: form.rate_pct, days: form.days })
        setResult({ type: 'deposit', ...r })
      } else {
        const r = await api.post('/api/tools/calc/credit', { amount: form.amount, rate_pct: form.rate_pct, months: form.months })
        setResult({ type: 'credit', ...r })
      }
    } catch {}
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex gap-2">
        {[['deposit','Depósito a Plazo'],['credit','Crédito / Cuota']].map(([m,l]) => (
          <button key={m} onClick={() => { setMode(m); setResult(null) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode===m ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        {mode === 'deposit' ? (
          <>
            <Input label="Capital inicial" type="number" prefix="$" value={form.principal}
              onChange={e => setForm({...form, principal: e.target.value})} />
            <Input label="Tasa anual" type="number" step="0.01" suffix="%" value={form.rate_pct}
              onChange={e => setForm({...form, rate_pct: e.target.value})} />
            <Input label="Plazo en días" type="number" suffix="días" value={form.days}
              onChange={e => setForm({...form, days: e.target.value})} />
          </>
        ) : (
          <>
            <Input label="Monto del crédito" type="number" prefix="$" value={form.amount}
              onChange={e => setForm({...form, amount: e.target.value})} />
            <Input label="Tasa anual" type="number" step="0.01" suffix="%" value={form.rate_pct}
              onChange={e => setForm({...form, rate_pct: e.target.value})} />
            <Input label="Número de cuotas" type="number" suffix="meses" value={form.months}
              onChange={e => setForm({...form, months: e.target.value})} />
          </>
        )}
        <Button onClick={calc} className="w-full">Calcular</Button>
      </div>

      {result && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="glass rounded-2xl p-5 space-y-3 border border-brand-500/20">
          <h3 className="text-sm font-semibold text-slate-300">Resultado</h3>
          {result.type === 'deposit' ? (
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-400 text-sm">Capital</span><span className="text-white num">{formatCLP(result.principal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 text-sm">Intereses</span><span className="text-green-400 num">{formatCLP(result.interest)}</span></div>
              <div className="flex justify-between border-t border-surface-600 pt-2"><span className="text-white font-semibold">Total al vencer</span><span className="text-white num font-bold text-lg">{formatCLP(result.final_amount)}</span></div>
              <p className="text-xs text-slate-500">Tasa efectiva para el período: {formatPct(result.effective_rate)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-400 text-sm">Cuota mensual</span><span className="text-white num font-bold text-xl">{formatCLP(result.monthly_payment)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 text-sm">Total a pagar</span><span className="text-white num">{formatCLP(result.total_payment)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 text-sm">Costo total intereses</span><span className="text-red-400 num">{formatCLP(result.interest_total)}</span></div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}