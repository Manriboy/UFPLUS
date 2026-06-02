// src/app/api/admin/external/sync/iris/daily/route.ts
// Sync diario ultra-rápido: solo renueva token y actualiza disponibilidad.
// NO actualiza precios (semanal). Solo 2 queries de DB.
// Tiempo estimado: < 30 segundos.
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refreshIrisToken } from '@/lib/iris-token'
import prisma from '@/lib/prisma'

const IRIS_SEARCH_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'
const PAGE_SIZE = 50

async function fetchPage(page: number, token: string) {
  return fetch(IRIS_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: 'https://iris.yapo.cl',
      Referer: 'https://iris.yapo.cl/',
    },
    body: JSON.stringify({
      filters: { operation_type: 'Venta', identifiers: [], level: '2' },
      order: ['promos', 'popularity'],
      pagination: { page, size: PAGE_SIZE },
    }),
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (progress: number, message: string, extra: Record<string, unknown> = {}) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress, message, ...extra })}\n\n`)) } catch {}
      }

      try {
        // 1. Renovar token
        send(5, 'Renovando token...')
        let token = await refreshIrisToken()
        if (!token) throw new Error('No se pudo renovar el token de Iris')
        send(15, 'Token renovado ✓')

        // 2. Descargar todos los proyectos con sus unidades (páginas en paralelo)
        send(20, 'Descargando datos de Iris...')
        let firstRes = await fetchPage(1, token)
        if (!firstRes.ok) {
          token = await refreshIrisToken()
          if (!token) throw new Error('Token expirado')
          firstRes = await fetchPage(1, token)
        }
        if (!firstRes.ok) throw new Error(`Iris error ${firstRes.status}`)

        const firstData = await firstRes.json()
        const totalPages = Math.ceil((firstData.total ?? 0) / PAGE_SIZE)
        const allProjects = [...(firstData.data ?? [])]

        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              fetchPage(i + 2, token!)
                .then(r => r.json())
                .then(d => d.data ?? [])
                .catch(() => [])
            )
          )
          allProjects.push(...rest.flat())
        }
        send(55, `${allProjects.length} proyectos descargados`)

        // 3. Extraer IDs de unidades disponibles según la API
        const activeSourceIds = allProjects
          .flatMap((p: { units?: { id: unknown }[] }) => p.units ?? [])
          .map((u: { id: unknown }) => String(u.id))

        send(70, `${activeSourceIds.length} unidades activas identificadas`)

        // 4. Actualizar disponibilidad en 2 queries (sin importar cuántas unidades haya)
        await prisma.externalUnit.updateMany({
          where: { source: 'iris' },
          data: { available: false },
        })

        if (activeSourceIds.length > 0) {
          await prisma.externalUnit.updateMany({
            where: { source: 'iris', sourceId: { in: activeSourceIds } },
            data: { available: true },
          })
        }

        send(100, `Listo: ${activeSourceIds.length} unidades disponibles de ${allProjects.length} proyectos`, { done: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        send(0, msg, { error: true })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
