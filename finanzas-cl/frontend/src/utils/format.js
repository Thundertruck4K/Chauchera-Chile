export function formatCLP(amount, options = {}) {
  const { compact = false, signed = false } = options
  const num = parseFloat(amount) || 0
  const prefix = signed && num > 0 ? '+' : ''
  if (compact && Math.abs(num) >= 1_000_000) {
    return prefix + '$' + (num / 1_000_000).toFixed(1) + 'M'
  }
  if (compact && Math.abs(num) >= 1_000) {
    return prefix + '$' + (num / 1_000).toFixed(0) + 'K'
  }
  return prefix + new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0
  }).format(num)
}

export function formatDate(date, fmt = 'dd/MM/yyyy') {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d)) return ''
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const yyyy = d.getFullYear()
  return fmt.replace('dd',dd).replace('MM',mm).replace('yyyy',yyyy)
}

export function formatPct(val) {
  return `${parseFloat(val || 0).toFixed(2)}%`
}

export function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / (1000*60*60*24))
}

export function relativeTime(date) {
  const diff = Date.now() - new Date(date)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Hace ${days}d`
  return formatDate(date)
}