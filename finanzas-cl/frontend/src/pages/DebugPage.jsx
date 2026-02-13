import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Trash2, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react'
import api from '../utils/api'
import { formatCLP, relativeTime } from '../utils/format'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'


const LEVEL_CONFIG = {
  debug: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Info },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Info },
  warn: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
  error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
}

export default function DebugPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetting, setResetting] = useState(false)


  async function loadLogs() {
    setLoading(true)
    try {
      const d = await api.get('/api/debug/logs?limit=100&' + (level ? 'level='+level : ''))
      setLogs(d.data); setTotal(d.total)
    } catch {} finally { setLoading(false) }
  }

  async function loadStats() {
    try { const d = await api.get('/api/debug/stats'); setStats(d) } catch {}
  }

  useEffect(() => { loadLogs(); loadStats() }, [level])
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => { loadLogs() }, 5000)
    return () => clearInterval(t)
  }, [autoRefresh, level])

  async function clearLogs() {
    if (!confirm('¿Eliminar logs de más de 30 días?')) return
    await api.delete('/api/debug/logs?days=30')
    loadLogs()
  }

  async function handleHardReset() {
    if (resetConfirmation !== 'RESET TODO') {
      toast.error('Debes escribir exactamente "RESET TODO"')
      return
    }
  
    setResetting(true)
    try {
      await api.post('/api/reset/hard-reset', { confirmation: resetConfirmation })
      toast.success('Base de datos reseteada. Redirigiendo al setup...')
        setTimeout(() => {
        localStorage.removeItem('finanzas_token')
        window.location.href = '/setup'
      }, 2000)
    } catch (err) {
      toast.error('Error al resetear: ' + (err.response?.data?.error || err.message))
      setResetting(false)
  }
}

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Panel de Debug</h1>
        <p className="text-slate-500 text-sm">Logs, errores y métricas del sistema</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1">Versión Node</p>
            <p className="text-white font-mono">{stats.node_version}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1">Uptime</p>
            <p className="text-white num">{Math.floor(stats.uptime/3600)}h {Math.floor((stats.uptime%3600)/60)}m</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1">Tamaño DB</p>
            <p className="text-white">{stats.db_size}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1">Memoria usada</p>
            <p className="text-white num">{Math.round(stats.memory?.heapUsed / 1048576)}MB / {Math.round(stats.memory?.heapTotal / 1048576)}MB</p>
          </div>
        </div>
      )}

      {/* Log counts by level */}
      {stats?.logs_24h && (
        <div className="glass rounded-2xl p-4 flex flex-wrap gap-4">
          <span className="text-xs text-slate-500 self-center">Últimas 24h:</span>
          {stats.logs_24h.map(l => {
            const cfg = LEVEL_CONFIG[l.level] || LEVEL_CONFIG.info
            return (
              <div key={l.level} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs ${cfg.bg} ${cfg.color}`}>
                <span className="font-semibold uppercase">{l.level}</span>
                <span className="font-mono">{l.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {['','debug','info','warn','error'].map(l => (
            <button key={l} onClick={() => setLevel(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${level===l ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400 hover:text-white'}`}>
              {l || 'Todos'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh 5s
          </label>
          <Button variant="ghost" size="sm" onClick={() => { loadLogs(); loadStats() }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Button>
	<Button variant="danger" size="sm" onClick={clearLogs}>
  <Trash2 size={13} /> Limpiar viejos
</Button>

{/* ← AGREGAR ESTE BOTÓN */}
<Button 
  variant="danger" 
  size="sm" 
  onClick={() => setShowResetModal(true)}
  className="ml-2"
>
  <AlertCircle size={13} /> Reset Total
</Button>
        </div>

      {/* Modal de confirmación de reset */}
      <Modal 
        open={showResetModal} 
        onClose={() => { setShowResetModal(false); setResetConfirmation('') }}
        title="⚠️ Reset Total de Base de Datos"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm font-semibold mb-2">
              ADVERTENCIA: Esta acción es IRREVERSIBLE
            </p>
            <ul className="text-red-300/80 text-xs space-y-1 list-disc list-inside">
              <li>Se eliminarán TODAS las cuentas, transacciones y datos</li>
              <li>Se perderán todos los movimientos importados</li>
              <li>Se perderán todas las herramientas financieras (DAP, créditos, etc.)</li>
              <li>Deberás volver a hacer el setup inicial</li>
              <li>Se mantendrán solo los bancos y categorías por defecto</li>
            </ul>
          </div>

          <div>
            <p className="text-white text-sm mb-2">
              Para confirmar, escribe exactamente: <code className="bg-surface-700 px-2 py-0.5 rounded text-red-400">RESET TODO</code>
            </p>
            <Input 
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
              placeholder="Escribe: RESET TODO"
              className="font-mono"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => { setShowResetModal(false); setResetConfirmation('') }}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              className="flex-1"
              onClick={handleHardReset}
              loading={resetting}
              disabled={resetConfirmation !== 'RESET TODO'}
            >
              Confirmar Reset Total
            </Button>
          </div>
        </div>
      </Modal>


      </div>

      {/* Log table */}
      <Card className="overflow-hidden p-0">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-800 border-b border-surface-700">
              <tr>
                <th className="text-left px-4 py-2.5 text-slate-500 font-medium w-20">Nivel</th>
                <th className="text-left px-4 py-2.5 text-slate-500 font-medium w-28">Tiempo</th>
                <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Mensaje</th>
                <th className="text-left px-4 py-2.5 text-slate-500 font-medium w-24">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {logs.map(log => {
                const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
                const Icon = cfg.icon
                return (
                  <tr key={log.id} className={`hover:bg-surface-700/30 transition-colors group`}>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon size={10} />
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{relativeTime(log.created_at)}</td>
                    <td className="px-4 py-2 text-white">
                      <span className="font-mono">{log.message}</span>
                      {log.context && log.context !== '{}' && (
                        <details className="mt-0.5">
                          <summary className="text-slate-500 cursor-pointer hover:text-slate-300">contexto</summary>
                          <pre className="text-slate-400 text-xs mt-1 overflow-x-auto bg-surface-900 p-2 rounded-lg">
                            {typeof log.context === 'string' ? log.context : JSON.stringify(log.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600 font-mono">{log.ip}</td>
                  </tr>
                )
              })}
              {!loading && !logs.length && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-500">Sin logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {logs.length < total && (
          <div className="border-t border-surface-700 px-4 py-2 text-xs text-slate-500 text-center">
            Mostrando {logs.length} de {total} logs
          </div>
        )}
      </Card>
    </div>
  )
}
