// src/lib/indicadores.ts
// Valores del Banco Central de Chile — se cachean 24h vía Next.js fetch cache

export interface Indicadores {
  uf:    { valor: number; fecha: string }
  dolar: { valor: number; fecha: string }
}

export async function getIndicadores(): Promise<Indicadores | null> {
  try {
    const res = await fetch('https://mindicador.cl/api', {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      uf:    { valor: data.uf.valor    as number, fecha: data.uf.fecha    as string },
      dolar: { valor: data.dolar.valor as number, fecha: data.dolar.fecha as string },
    }
  } catch {
    return null
  }
}
