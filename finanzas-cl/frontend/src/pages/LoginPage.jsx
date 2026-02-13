import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useStore(s => s.login)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass rounded-3xl p-8 w-full max-w-sm relative shadow-2xl">
        <div className="text-center mb-8">
          <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-glow">
            <span className="text-3xl font-black text-white">F</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-white">FinanzasCL</h1>
          <p className="text-slate-500 text-sm mt-1">Tu gestor financiero personal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" placeholder="tu@email.cl"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoFocus />
          <Input label="Contraseña" type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <Button type="submit" loading={loading} className="w-full mt-2">
            Ingresar
          </Button>
        </form>
      </motion.div>
    </div>
  )
}