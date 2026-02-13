import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, AlertCircle, Info, Bug, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../utils/api'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'
import { formatCLP, formatDate } from '../utils/format'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'

export default function ScannerPage() {
  const { accounts } = useStore()
  const [step, setStep] = useState('upload')
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importId, setImportId] = useState(null)
  const [bankDetected, setBankDetected] = useState('')
  const [transactions, setTransactions] = useState([])
  const [accountId, setAccountId] = useState('')
  const [result, setResult] = useState(null)
  const [warning, setWarning] = useState(null)
  const [debugResult, setDebugResult] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)

  const processFile = useCallback(async (file, debugMode = false) => {
    const formData = new FormData()
    formData.append('file', file)
    if (accountId) formData.append('account_id', accountId)

    if (debugMode) {
      setDebugLoading(true)
      try {
        const res = await api.post('/api/scanner/debug-extract', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setDebugResult(res)
        setShowDebug(true)
      } catch (err) {
        toast.error('Error al extraer texto del archivo')
      } finally { setDebugLoading(false) }
      return
    }

    setUploading(true)
    setWarning(null)
    try {
      const res = await api.post('/api/scanner/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportId(res.import_id)
      setBankDetected(res.bank_detected)
      setWarning(res.warning || null)
      setTransactions((res.all_transactions || []).map((t, i) => ({ ...t, id: i, include: true })))
      if (res.rows_found === 0) {
        toast.error('No se encontraron transacciones. Revisa el diagnóstico abajo.')
      } else {
        toast.success(`${res.rows_found} movimientos detectados`)
      }
      setStep('review')
    } catch (err) {
      toast.error('Error al procesar archivo: ' + (err.response?.data?.error || err.message))
    } finally { setUploading(false) }
  }, [accountId])

  const [currentFile, setCurrentFile] = useState(null)
  const onDrop = useCallback((files) => {
    if (!files.length) return
    setCurrentFile(files[0])
    processFile(files[0], false)
  }, [processFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  })

  async function confirmImport() {
    if (!accountId) return toast.error('Selecciona una cuenta destino')
    const selected = transactions.filter(t => t.include)
    if (!selected.length) return toast.error('No hay transacciones seleccionadas')
    setImporting(true)
    try {
      const res = await api.post(`/api/scanner/confirm/${importId}`, {
        account_id: accountId,
        transactions: transactions.map(t => ({
          include: t.include, type: t.type,
          amount: t.amount, description: t.description, date: t.date
        }))
      })
      setResult(res)
      setStep('done')
    } catch {} finally { setImporting(false) }
  }

  function reset() {
    setStep('upload'); setTransactions([]); setImportId(null)
    setResult(null); setWarning(null); setDebugResult(null)
    setCurrentFile(null); setShowDebug(false)
  }

  function toggleTx(id) {
    setTransactions(txs => txs.map(t => t.id === id ? { ...t, include: !t.include } : t))
  }
  function setTxType(id, type) {
    setTransactions(txs => txs.map(t => t.id === id ? { ...t, type } : t))
  }
  function setTxAmount(id, amount) {
    setTransactions(txs => txs.map(t => t.id === id ? { ...t, amount: parseFloat(amount) || 0 } : t))
  }
  function setTxDesc(id, description) {
    setTransactions(txs => txs.map(t => t.id === id ? { ...t, description } : t))
  }

  const selected = transactions.filter(t => t.include)

  const STEPS = [
    { id: 'upload', label: 'Subir archivo' },
    { id: 'review', label: 'Revisar' },
    { id: 'done', label: 'Completado' },
  ]

  const stepIdx = STEPS.findIndex(s => s.id === step)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Escáner de Cartolas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Importa estados de cuenta en PDF, CSV o Excel desde cualquier banco chileno</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map(({ id, label }, i) => (
          <div key={id} className="flex items-center gap-2">
            {i > 0 && <div className={`w-10 h-px ${i <= stepIdx ? 'bg-brand-500' : 'bg-surface-600'}`} />}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg
              ${step === id ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : i < stepIdx ? 'text-green-400' : 'text-slate-600'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs
                ${step === id ? 'bg-brand-600 text-white'
                  : i < stepIdx ? 'bg-green-600/30 text-green-400'
                  : 'bg-surface-700 text-slate-600'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── STEP: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4 animate-fade-in">
          {/* Account selector */}
          <div className="glass rounded-2xl p-4">
            <Select label="Cuenta destino" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Seleccionar después de revisar</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {a.bank_name || 'Sin banco'}</option>)}
            </Select>
          </div>

          {/* Drop zone */}
          <div {...getRootProps()} className={`glass rounded-2xl p-10 border-2 border-dashed cursor-pointer transition-all text-center
              ${isDragActive ? 'border-brand-500 bg-brand-500/8 scale-[1.01]' : 'border-surface-600 hover:border-brand-500/50 hover:bg-surface-700/30'}`}>
            <input {...getInputProps()} />
            <motion.div animate={{ y: isDragActive ? -6 : 0 }} className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all
                  ${isDragActive ? 'bg-brand-600 shadow-glow' : 'bg-surface-700'}`}>
                {uploading
                  ? <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  : <Upload size={28} className={isDragActive ? 'text-white' : 'text-slate-400'} />}
              </div>
              {uploading
                ? <div>
                    <p className="text-white font-medium">Procesando archivo...</p>
                    <p className="text-slate-500 text-sm">Extrayendo y reconociendo movimientos</p>
                  </div>
                : <div>
                    <p className="text-white font-semibold text-lg">
                      {isDragActive ? 'Suelta aquí' : 'Arrastra tu cartola o haz click'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">Soporta PDF, CSV, XLSX, XLS y TXT</p>
                  </div>}
              {!uploading && (
                <div className="flex gap-2">
                  {['PDF', 'CSV', 'XLSX', 'XLS', 'TXT'].map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-lg bg-surface-700 text-slate-400 font-mono">{f}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Tips */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bancos compatibles</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                {['BancoEstado CSV','Banco de Chile CSV','BCI Excel','Santander CSV',
                  'Itaú CSV','Scotiabank CSV','MACH / Tenpo','Formato genérico'].map(b => (
                  <div key={b} className="flex items-center gap-1.5">
                    <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Consejos para mejores resultados</p>
              <div className="space-y-1.5 text-xs text-slate-500">
                {[
                  'Prefiere CSV o Excel sobre PDF',
                  'Descarga directo desde banca en línea',
                  'Los PDF escaneados no son legibles',
                  'Si falla, usa el botón Diagnóstico',
                ].map(t => (
                  <div key={t} className="flex items-start gap-1.5">
                    <Info size={10} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: Review ── */}
      {step === 'review' && (
        <div className="space-y-4 animate-fade-in">
          {/* Info bar */}
          <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-semibold">Banco detectado:</p>
                <span className="text-brand-400 text-sm font-medium">{bankDetected}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {transactions.length} movimientos encontrados · <span className="text-white">{selected.length} seleccionados</span>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-48">
                <Select value={accountId} onChange={e => setAccountId(e.target.value)} required>
                  <option value="">⚠ Selecciona cuenta destino</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </div>
              <Button variant="secondary" size="sm" onClick={reset}>← Volver</Button>
              <Button size="sm" onClick={confirmImport} loading={importing}
                disabled={!accountId || !selected.length}>
                Importar {selected.length} movimientos
              </Button>
            </div>
          </div>

          {/* Warning */}
          {warning && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-medium">Advertencia del escáner</p>
                <p className="text-amber-400/80 text-xs mt-0.5">{warning}</p>
              </div>
            </motion.div>
          )}

          {/* No transactions found */}
          {transactions.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <AlertCircle size={40} className="text-amber-400 mx-auto mb-3" />
              <p className="text-white font-semibold mb-2">No se encontraron movimientos</p>
              <p className="text-slate-400 text-sm mb-4">
                El archivo fue subido pero el parser no pudo identificar filas de transacciones.<br />
                Usa el botón de diagnóstico para ver qué texto extrajo el sistema.
              </p>
              {currentFile && (
                <Button variant="secondary" size="sm" loading={debugLoading}
                  onClick={() => processFile(currentFile, true)}>
                  <Bug size={14} /> Ver diagnóstico del archivo
                </Button>
              )}
            </div>
          )}

          {/* Debug panel */}
          {debugResult && (
            <div className="glass rounded-2xl border border-amber-500/20">
              <button onClick={() => setShowDebug(!showDebug)}
                className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                  <Bug size={15} /> Diagnóstico del archivo
                  <span className="text-slate-500 text-xs font-normal">
                    — {debugResult.lines_total} líneas, {debugResult.text_length} chars, {debugResult.transactions_found} txs detectadas
                  </span>
                </div>
                {showDebug ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>
              <AnimatePresence>
                {showDebug && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4">
                      <p className="text-xs text-slate-500 mb-2">Texto extraído (primeros 2000 caracteres):</p>
                      <pre className="bg-surface-900 text-green-400 text-xs p-3 rounded-xl overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                        {debugResult.text_preview}
                      </pre>
                      {debugResult.first_10?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-2">Primeras filas parseadas:</p>
                          <div className="space-y-1">
                            {debugResult.first_10.map((t, i) => (
                              <div key={i} className="text-xs bg-surface-900 px-3 py-1.5 rounded-lg font-mono text-slate-300">
                                {t.date} | {t.type} | {formatCLP(t.amount)} | {t.description?.slice(0, 60)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Transactions table */}
          {transactions.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              {/* Bulk actions */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-700 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={transactions.every(t => t.include)}
                    onChange={e => setTransactions(txs => txs.map(t => ({ ...t, include: e.target.checked })))}
                    className="rounded" />
                  <span className="text-slate-400">Seleccionar todos</span>
                </label>
                <span className="text-slate-600">|</span>
                <button onClick={() => setTransactions(txs => txs.map(t => ({ ...t, type: 'expense' })))}
                  className="text-red-400 hover:text-red-300 transition-colors">Todo gastos</button>
                <button onClick={() => setTransactions(txs => txs.map(t => ({ ...t, type: 'income' })))}
                  className="text-green-400 hover:text-green-300 transition-colors">Todo ingresos</button>
                <span className="ml-auto text-slate-500">
                  Total seleccionado: <span className="text-white num">
                    {formatCLP(selected.reduce((s, t) => s + t.amount, 0))}
                  </span>
                </span>
              </div>

              <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-800 z-10">
                    <tr className="border-b border-surface-700">
                      <th className="px-3 py-2 w-8 text-left"></th>
                      <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium">Descripción</th>
                      <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right text-xs text-slate-500 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {transactions.map(tx => (
                      <tr key={tx.id}
                        className={`transition-colors ${!tx.include ? 'opacity-35' : 'hover:bg-surface-700/25'}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={tx.include}
                            onChange={() => toggleTx(tx.id)} className="rounded cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-slate-400 num text-xs whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-3 py-2 min-w-48 max-w-64">
                          <input value={tx.description} onChange={e => setTxDesc(tx.id, e.target.value)}
                            className="w-full bg-transparent text-white text-xs focus:outline-none focus:bg-surface-700 rounded px-1 py-0.5" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={tx.type} onChange={e => setTxType(tx.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-lg border bg-surface-800 cursor-pointer focus:outline-none
                              ${tx.type === 'income' ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                            <option value="income">↑ Ingreso</option>
                            <option value="expense">↓ Gasto</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={tx.amount} onChange={e => setTxAmount(tx.id, e.target.value)}
                            className={`w-28 bg-transparent text-right num font-medium text-xs focus:outline-none focus:bg-surface-700 rounded px-1 py-0.5
                              ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diagnose button (when transactions > 0 but want to debug) */}
          {transactions.length > 0 && currentFile && (
            <div className="flex justify-end">
              <button onClick={() => processFile(currentFile, true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <Bug size={12} /> Diagnóstico del archivo
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: Done ── */}
      {step === 'done' && result && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={34} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Importación completada!</h2>
          <p className="text-slate-400 mb-8">{result.message}</p>
          <div className="flex justify-center gap-10 text-sm mb-8">
            <div>
              <p className="text-3xl font-bold text-green-400 num">{result.imported}</p>
              <p className="text-slate-500 mt-1">Importados</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-500 num">{result.skipped}</p>
              <p className="text-slate-500 mt-1">Omitidos</p>
            </div>
          </div>
          <Button onClick={reset}>Importar otra cartola</Button>
        </motion.div>
      )}
    </div>
  )
}