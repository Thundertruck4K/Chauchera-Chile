import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function SetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ setup_token: '', name: '', email: '', password: '', password2: '' })

  useEffect(() => {
    api.get('/api/setup/status').then(d => {
      if (d.setup_complete) navigate('/login')
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.password2) return toast.error('Las contraseñas no coinciden')
    setSubmitting(true)
    try {
      await api.post('/api/setup/init', form)
      toast.success('¡Configuración completada! Ingresa con tu cuenta.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al configurar')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="min-h-screen bg-surface-900 flex items-center justify-center"><span className="text-slate-400">Cargando...</span></div>

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-2xl font-bold text-white">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Configuración inicial</h1>
          <p className="text-slate-400 text-sm">Crea tu cuenta de administrador para comenzar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Token de configuración" type="password" placeholder="Token del archivo .env"
            value={form.setup_token} onChange={e => setForm({...form, setup_token: e.target.value})} />
          <Input label="Tu nombre" placeholder="Juan Pérez"
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <Input label="Email" type="email" placeholder="juan@ejemplo.cl"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <Input label="Contraseña" type="password" placeholder="Mínimo 8 caracteres"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <Input label="Confirmar contraseña" type="password" placeholder="Repite la contraseña"
            value={form.password2} onChange={e => setForm({...form, password2: e.target.value})} required />
          <Button type="submit" loading={submitting} className="w-full mt-2">
            Crear cuenta y comenzar
          </Button>
        </form>
      </motion.div>
    </div>
  )
}