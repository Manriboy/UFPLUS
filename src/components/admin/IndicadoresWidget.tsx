// src/components/admin/IndicadoresWidget.tsx
import { getIndicadores } from '@/lib/indicadores'

export default async function IndicadoresWidget() {
  const data = await getIndicadores()
  if (!data) return null

  const fecha = new Date(data.uf.fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div className="flex items-center gap-4 border border-[#941914] rounded-lg px-4 py-2.5">
      <div className="text-right">
        <p className="text-sm font-semibold text-brand-text leading-none">
          UF&nbsp;$&nbsp;{data.uf.valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fecha}</p>
      </div>
      <div className="border-l border-gray-200 pl-4 text-right">
        <p className="text-sm font-semibold text-brand-text leading-none">
          USD&nbsp;$&nbsp;{data.dolar.valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fecha}</p>
      </div>
    </div>
  )
}
