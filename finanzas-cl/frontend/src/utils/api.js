import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({ baseURL: API_URL, timeout: 30000 })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('finanzas_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Error de conexión'
    if (err.response?.status === 401) {
      localStorage.removeItem('finanzas_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }
    if (err.response?.status !== 404) toast.error(msg)
    return Promise.reject(err)
  }
)

export default api