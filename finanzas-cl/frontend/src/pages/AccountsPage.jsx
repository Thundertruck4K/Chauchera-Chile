import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, CreditCard, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { formatCLP } from '../utils/format'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const ICONS = ['wallet', 'credit-card', 'piggy-bank', 'building', 'smartphone', 'briefcase']
const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#3b82f6']

export default function AccountsPage() {
  const { accounts, banks, accountTypes, fetchAccounts } = useStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name:'', bank_id:'', type_id:'', number:'', currency:'CLP', balance:0, credit_limit:'', cut_day:'', pay_day:'', color:'#6366f1', icon:'wallet' })

  function openAdd() { setEditing(null); setForm({ name:'',bank_id:'',type_id:'',number:'',currency:'CLP',balance:0,credit_limit:'',cut_day:'',pay_day:'',color:'#6366f1',icon:'wallet' }); setModal(true) }
  function openEdit(acc) {
    setEditing(acc)
    setForm({ name:acc.name, bank_id:acc.bank_id||'', type_id:acc.type_id||'', number:acc.number||'', currency:acc.currency||'CLP', balance:acc.balance||0, credit_limit:acc.credit_limit||'', cut_day:acc.cut_day||'', pay_day:acc.pay_day||'', color:acc.color||'#6366f1', icon:acc.icon||'wallet' })
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) { await api.put(`/api/accounts/${editing.id}`, form); toast.success('Cuenta actualizada') }
      else { await api.post('/api/accounts', form); toast.success('Cuenta creada') }
      await fetchAccounts(); setModal(false)
    } catch { } finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await api.delete(`/api/accounts/${id}`)
    toast.success('Cuenta eliminada')
    await fetchAccounts()
  }

  const totalBalance = accounts.reduce((s,a) => s + parseFloat(a.balance||0), 0)
  const creditAccounts = accounts.filter(a => a.category === 'credito')
  const totalDebt = creditAccounts.reduce((s,a) => s + parseFloat(a.balance||0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cuentas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Bancos, tarjetas y productos financieros</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} /> Nueva cuenta</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border-l-2 border-brand-500">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total activos</p>
          <p className="text-2xl font-bold text-white num">{formatCLP(totalBalance)}</p>
        </div>
        <div className="glass rounded-2xl p-5 border-l-2 border-red-500">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Deuda tarjetas</p>
          <p className="text-2xl font-bold text-red-400 num">{formatCLP(totalDebt)}</p>
        </div>
        <div className="glass rounded-2xl p-5 border-l-2 border-green-500">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cuentas activas</p>
          <p className="text-2xl font-bold text-white num">{accounts.length}</p>
        </div>
      </div>

       {/* Cards grid - Agrupadas por banco */}
      <div className="space-y-6">
        {(() => {
          // Agrupar cuentas por banco
          const grouped = accounts.reduce((acc, account) => {
            const bankName = account.bank_name || 'Sin banco asignado';
            if (!acc[bankName]) acc[bankName] = [];
            acc[bankName].push(account);
            return acc;
          }, {});

          // Ordenar bancos alfabéticamente
          const sortedBanks = Object.keys(grouped).sort((a, b) => {
            if (a === 'Sin banco asignado') return 1;
            if (b === 'Sin banco asignado') return -1;
            return a.localeCompare(b);
          });

          return sortedBanks.map(bankName => {
            const bankAccounts = grouped[bankName];
            const bankColor = bankAccounts[0]?.bank_color || '#6366f1';
            const bankTotal = bankAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

            return (
              <motion.div
                key={bankName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Bank header */}
                <div className="flex items-center gap-3 px-1">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ background: bankColor }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">{bankName}</h3>
                    <p className="text-xs text-slate-500">
                      {bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''} · Total: {' '}
                      <span className={`num font-semibold ${bankTotal < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatCLP(bankTotal)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Accounts of this bank */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {bankAccounts.map((acc, i) => (
                    <motion.div
                      key={acc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass glass-hover rounded-2xl p-5 group"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: acc.color || '#6366f1' }}
                          >
                            {acc.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{acc.name}</p>
                            <p className="text-xs text-slate-500">{acc.type_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(acc)}
                            className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-400 hover:text-white transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Account number */}
                      {acc.number && (
                        <p className="text-xs text-slate-600 num mb-3">
                          {'•••• ' + (acc.number.slice(-4) || '****')}
                        </p>
                      )}

                      {/* Balance */}
                      <p className={`text-2xl font-bold num ${parseFloat(acc.balance) < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatCLP(acc.balance)}
                      </p>

                      {/* Credit info */}
                      {acc.credit_limit && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Usado: {formatCLP(acc.balance)}</span>
                            <span>Límite: {formatCLP(acc.credit_limit)}</span>
                          </div>
                          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.abs(acc.balance / acc.credit_limit * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-600 px-2 py-0.5 bg-surface-700 rounded-lg">
                          {acc.category}
                        </span>
                        <span className="text-xs text-slate-600">{acc.currency}</span>
                      </div>
                    </motion.div>
                  ))}

                  {/* Add new account card - solo en el último banco */}
                  {bankName === sortedBanks[sortedBanks.length - 1] && (
                    <motion.button
                      onClick={openAdd}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="glass rounded-2xl p-5 border-2 border-dashed border-surface-600 hover:border-brand-500/50 flex items-center justify-center gap-2 text-slate-500 hover:text-brand-400 transition-all min-h-36"
                    >
                      <Plus size={20} />
                      <span className="text-sm font-medium">Agregar cuenta</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          });
        })()}

        {/* Add card if no accounts */}
        {accounts.length === 0 && (
          <motion.button
            onClick={openAdd}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="glass rounded-2xl p-12 border-2 border-dashed border-surface-600 hover:border-brand-500/50 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-brand-400 transition-all"
          >
            <Plus size={32} />
            <div className="text-center">
              <p className="text-lg font-medium">Agregar primera cuenta</p>
              <p className="text-xs text-slate-600 mt-1">Comienza agregando una cuenta bancaria o tarjeta</p>
            </div>
          </motion.button>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar cuenta' : 'Nueva cuenta'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nombre" placeholder="ej: Cuenta Corriente BCI" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <Select label="Banco" value={form.bank_id} onChange={e => setForm({...form, bank_id: e.target.value})}>
              <option value="">Sin banco</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label="Tipo" value={form.type_id} onChange={e => setForm({...form, type_id: e.target.value})}>
              <option value="">Tipo de cuenta</option>
              {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Input label="Número / últimos 4 dígitos" placeholder="0000" value={form.number}
              onChange={e => setForm({...form, number: e.target.value})} />
            <Select label="Moneda" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
              <option value="CLP">CLP – Peso chileno</option>
              <option value="USD">USD – Dólar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="UF">UF – Unidad de Fomento</option>
            </Select>
            <Input label="Saldo actual" type="number" prefix="$" value={form.balance}
              onChange={e => setForm({...form, balance: e.target.value})} />
            <Input label="Límite de crédito" type="number" prefix="$" placeholder="Solo tarjetas" value={form.credit_limit}
              onChange={e => setForm({...form, credit_limit: e.target.value})} />
            <Input label="Día de corte" type="number" min="1" max="31" placeholder="ej: 15" value={form.cut_day}
              onChange={e => setForm({...form, cut_day: e.target.value})} />
            <Input label="Día de pago" type="number" min="1" max="31" placeholder="ej: 5" value={form.pay_day}
              onChange={e => setForm({...form, pay_day: e.target.value})} />
          </div>
          {/* Color picker */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color===c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">{editing ? 'Guardar' : 'Crear cuenta'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}