import { create } from 'zustand'
import api from '../utils/api'

export const useStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('finanzas_token'),
  accounts: [],
  categories: [],
  banks: [],
  accountTypes: [],
  indicators: [],

  login: async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('finanzas_token', data.token)
    set({ user: data.user, token: data.token })
    return data
  },

  logout: () => {
    localStorage.removeItem('finanzas_token')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const data = await api.get('/api/auth/me')
      set({ user: data.user })
    } catch { get().logout() }
  },

  fetchAccounts: async () => {
    const data = await api.get('/api/accounts')
    set({ accounts: data })
    return data
  },

  fetchCategories: async () => {
    const data = await api.get('/api/transactions/categories')
    set({ categories: data })
    return data
  },

  fetchBanks: async () => {
    const data = await api.get('/api/accounts/banks')
    set({ banks: data })
    return data
  },

  fetchAccountTypes: async () => {
    const data = await api.get('/api/accounts/types')
    set({ accountTypes: data })
    return data
  },

  fetchIndicators: async () => {
    try {
      const data = await api.get('/api/indicators')
      set({ indicators: data })
    } catch {}
  },
}))