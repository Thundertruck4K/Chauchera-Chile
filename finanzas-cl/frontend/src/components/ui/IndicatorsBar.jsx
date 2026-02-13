import { useStore } from '../../store/useStore'
import { formatCLP } from '../../utils/format'

export default function IndicatorsBar() {
  const indicators = useStore(s => s.indicators)
  const ind = Object.fromEntries((indicators || []).map(i => [i.name, i.value]))

  return (
    <div className="flex items-center gap-4 text-xs text-slate-400 overflow-x-auto">
      {ind.UF && <span className="whitespace-nowrap"><span className="text-slate-500">UF</span> <span className="text-white num">{parseFloat(ind.UF).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span></span>}
      {ind.USD && <span className="whitespace-nowrap"><span className="text-slate-500">USD</span> <span className="text-green-400 num">${parseFloat(ind.USD).toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span></span>}
      {ind.EUR && <span className="whitespace-nowrap"><span className="text-slate-500">EUR</span> <span className="text-blue-400 num">${parseFloat(ind.EUR).toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span></span>}
      {ind.UTM && <span className="whitespace-nowrap"><span className="text-slate-500">UTM</span> <span className="text-purple-400 num">${parseFloat(ind.UTM).toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span></span>}
    </div>
  )
}