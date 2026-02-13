import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import { useEffect } from 'react'
import Layout from './components/ui/Layout'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import TransactionsPage from './pages/TransactionsPage'
import ToolsPage from './pages/ToolsPage'
import ScannerPage from './pages/ScannerPage'
import ReportsPage from './pages/ReportsPage'
import DebugPage from './pages/DebugPage'
import TaxPage from './pages/TaxPage'


function PrivateRoute({ children }) {
  const token = useStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token, fetchMe, fetchAccounts, fetchCategories, fetchBanks, fetchAccountTypes, fetchIndicators } = useStore()

  useEffect(() => {
    if (token) {
      fetchMe()
      fetchAccounts()
      fetchCategories()
      fetchBanks()
      fetchAccountTypes()
      fetchIndicators()
    }
  }, [token])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a2236', color: '#fff', border: '1px solid rgba(91,123,245,0.3)', fontFamily: 'Plus Jakarta Sans' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="tax" element={<TaxPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="debug" element={<DebugPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
