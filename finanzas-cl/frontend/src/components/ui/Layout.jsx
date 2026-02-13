import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, Wrench,
  Receipt, ScanLine, FileText, Bug, LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import IndicatorsBar from './IndicatorsBar'
import ThemeSwitcher from './ThemeSwitcher'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: CreditCard, label: 'Cuentas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/tools', icon: Wrench, label: 'Herramientas' },
  { to: '/tax', icon: Receipt, label: 'Tributación' },
  { to: '/scanner', icon: ScanLine, label: 'Cartolas' },
  { to: '/reports', icon: FileText, label: 'Reportes' },
  { to: '/debug', icon: Bug, label: 'Debug', bottom: true },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useStore()
  const location = useLocation()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 mb-6 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shadow-glow flex-shrink-0">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg gradient-text">
            FinanzasCL
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV.filter(n => !n.bottom).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
              ${isActive ? 'nav-active text-brand-400 font-semibold' : 'text-slate-400 hover:text-white hover:bg-surface-700'}`}>
            <Icon size={18} className="flex-shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1 mt-auto">
        {NAV.filter(n => n.bottom).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm
              ${isActive ? 'nav-active text-brand-400 font-semibold' : 'text-slate-500 hover:text-white hover:bg-surface-700'}`}>
            <Icon size={16} />
            {!collapsed && label}
          </NavLink>
        ))}

        {/* User */}
        <div className={`pt-3 border-t border-surface-700 ${collapsed ? 'flex justify-center' : 'flex items-center gap-2'}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
          <button onClick={logout} title="Cerrar sesión"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-surface-800 border-r border-surface-700 relative z-20 overflow-hidden">
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-surface-700 border border-surface-600 text-slate-400 hover:text-white flex items-center justify-center hover:bg-brand-600 transition-colors">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed left-0 top-0 h-full w-60 bg-surface-800 z-40 lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
    <header className="h-12 flex items-center justify-between px-4 border-b border-surface-700 bg-surface-800/80 backdrop-blur-sm z-10">
  <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-slate-400 hover:text-white">
    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
  </button>
  
  <div className="flex items-center gap-3 ml-auto">  {/* ← AGREGAR este div */}
    <ThemeSwitcher />  {/* ← AGREGAR */}
    <IndicatorsBar />
  </div>
</header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
