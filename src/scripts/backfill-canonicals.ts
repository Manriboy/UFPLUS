// src/scripts/backfill-canonicals.ts
// Run: npx tsx src/scripts/backfill-canonicals.ts
import prisma from '../lib/prisma'
import { assignAndMergeCanonical } from '../lib/canonical-merge'

const SOURCE_ORDER: Record<string, number> = { jetbrokers: 0, iris: 1, brouk: 2 }

async function main() {
  const projects = await prisma.externalProject.findMany({
    where: { canonicalId: null },
    select: { id: true, source: true, name: true },
  })

  projects.sort(
    (a, b) => (SOURCE_ORDER[a.source] ?? 9) - (SOURCE_ORDER[b.source] ?? 9)
  )

  console.log(`Backfilling ${projects.length} projects...`)

  for (let i = 0; i < projects.length; i++) {
    await assignAndMergeCanonical(projects[i].id)
    if ((i + 1) % 20 === 0 || i === projects.length - 1) {
      console.log(`  ${i + 1}/${projects.length}`)
    }
  }

  const canonicalCount = await prisma.canonicalProject.count()
  console.log(`Done. ${canonicalCount} canonical projects created.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
