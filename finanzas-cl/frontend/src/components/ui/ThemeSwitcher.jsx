import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const THEMES = [
  { id: 'default', name: 'Azul Profundo', primary: '#5b7bf5', accent: '#a78bfa', bg: '#0a0e1a' },
  { id: 'emerald', name: 'Esmeralda', primary: '#10b981', accent: '#34d399', bg: '#022c22' },
  { id: 'amber', name: 'Ámbar', primary: '#f59e0b', accent: '#fbbf24', bg: '#1c1410' },
  { id: 'rose', name: 'Rosa', primary: '#f43f5e', accent: '#fb7185', bg: '#1a0a0f' },
  { id: 'purple', name: 'Púrpura', primary: '#a855f7', accent: '#c084fc', bg: '#1a0a1f' },
  { id: 'cyan', name: 'Cyan', primary: '#06b6d4', accent: '#22d3ee', bg: '#0a1a1f' },
  { id: 'slate', name: 'Pizarra', primary: '#64748b', accent: '#94a3b8', bg: '#0f1419' },
]

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('default')

  useEffect(() => {
    const saved = localStorage.getItem('finanzas_theme') || 'default'
    setCurrentTheme(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
    const root = document.documentElement
    
    root.style.setProperty('--brand', theme.primary)
    root.style.setProperty('--brand-light', theme.accent)
    root.style.setProperty('--surface-900', theme.bg)
    
    // Gradient variations
    root.style.setProperty('--gradient-from', theme.primary)
    root.style.setProperty('--gradient-to', theme.accent)
    
    localStorage.setItem('finanzas_theme', themeId)
    setCurrentTheme(themeId)
  }

  const activeTheme = THEMES.find(t => t.id === currentTheme)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-surface-700 transition-colors text-slate-400 hover:text-white"
        title="Cambiar tema de colores"
      >
        <Palette size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 z-50 glass rounded-xl shadow-2xl border border-surface-600 p-3 w-56"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">Tema de colores</p>
              <div className="space-y-1">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => { applyTheme(theme.id); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left
                      ${currentTheme === theme.id ? 'bg-surface-700 ring-1 ring-white/20' : 'hover:bg-surface-700/50'}`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: theme.primary }} />
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: theme.accent }} />
                    </div>
                    <span className="text-sm text-white">{theme.name}</span>
                    {currentTheme === theme.id && (
                      <span className="ml-auto text-green-400 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
