import prisma from './prisma'

export type SyncSource = 'brouk' | 'iris' | 'iris-daily'

export async function recordSyncTimestamp(source: SyncSource): Promise<void> {
  await prisma.setting.upsert({
    where:  { key: `last_sync_${source}` },
    update: { value: new Date().toISOString() },
    create: { key: `last_sync_${source}`, value: new Date().toISOString() },
  })
}

export async function getSyncTimestamps(): Promise<Record<SyncSource, string | null>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['last_sync_brouk', 'last_sync_iris', 'last_sync_iris-daily'] } },
  })
  const map = Object.fromEntries(rows.map(r => [r.key.replace('last_sync_', ''), r.value]))
  return {
    'brouk':      map['brouk']      ?? null,
    'iris':       map['iris']       ?? null,
    'iris-daily': map['iris-daily'] ?? null,
  }
}
