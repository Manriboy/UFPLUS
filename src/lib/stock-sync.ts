// src/lib/stock-sync.ts
// Stock sync engine: reads from Google Sheets or .xlsx via Google Drive,
// normalizes rows using the per-project column mapper, and upserts Units in the DB.

import { google } from 'googleapis'
import ExcelJS from 'exceljs'
import { Readable } from 'stream'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ─── Types ────────────────────────────────────────────

export interface ColumnMapper {
  numero?: string
  piso?: string
  orientacion?: string
  tipologia?: string
  supInterior?: string
  supTerraza?: string
  supTotal?: string
  precioUf?: string
  descuento?: string
  bonoPie?: string
  precioEstac?: string
  precioBodega?: string
  disponible?: string
}

export interface NormalizedUnit {
  numero: string
  piso?: number | null
  orientacion?: string | null
  tipologia?: string | null
  supInterior?: number | null
  supTerraza?: number | null
  supTotal?: number | null
  precioUf?: number | null
  descuento?: number | null
  bonoPie?: number | null
  precioEstac?: number | null
  precioBodega?: number | null
  disponible: boolean
  rawData: Record<string, unknown>
}

export interface SyncResult {
  rowsFound: number
  rowsInserted: number
  rowsUpdated: number
  rowsSkipped: number
  errors: string[]
}

// ─── Google Auth ──────────────────────────────────────

function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Missing Google service account credentials in environment')
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })
}

// ─── Raw row fetchers ─────────────────────────────────

/**
 * Reads all rows from a Google Sheet tab.
 * Returns an array of objects keyed by header row values.
 */
async function fetchFromGoogleSheets(
  fileId: string,
  sheetName?: string | null
): Promise<Record<string, unknown>[]> {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const range = sheetName ? `${sheetName}!A:ZZ` : 'A:ZZ'
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: fileId,
    range,
  })

  const rows = res.data.values ?? []
  if (rows.length < 2) return []

  const headers = (rows[0] as string[]).map((h) => String(h ?? '').trim())
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      obj[h] = (row as unknown[])[i] ?? null
    })
    return obj
  })
}

/**
 * Downloads a .xlsx file from Drive and reads it with ExcelJS.
 * Returns rows as objects keyed by header row values.
 */
async function fetchFromXlsx(
  fileId: string,
  sheetName?: string | null
): Promise<Record<string, unknown>[]> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(response.data as Readable)

  const sheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0]

  if (!sheet) throw new Error(`Sheet "${sheetName ?? 'primera hoja'}" not found in workbook`)

  const rows: Record<string, unknown>[] = []
  let headers: string[] = []

  sheet.eachRow((row, rowNumber) => {
    const values = row.values as (ExcelJS.CellValue | null)[]
    // ExcelJS row.values is 1-indexed; slice(1) to make it 0-indexed
    const cells = values.slice(1).map((v) => {
      if (v === null || v === undefined) return null
      if (typeof v === 'object' && 'result' in v) return (v as ExcelJS.CellFormulaValue).result ?? null
      if (typeof v === 'object' && 'richText' in v) {
        return (v as ExcelJS.CellRichTextValue).richText?.map((r) => r.text).join('') ?? null
      }
      return v
    })

    if (rowNumber === 1) {
      headers = cells.map((c) => String(c ?? '').trim())
    } else {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { obj[h] = cells[i] ?? null })
      rows.push(obj)
    }
  })

  return rows
}

// ─── Normalization ─────────────────────────────────────

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseInt(String(v), 10)
  return isNaN(n) ? null : n
}

function toDisponible(v: unknown): boolean {
  if (v === null || v === undefined) return true
  const s = String(v).toLowerCase().trim()
  // Available keywords: "disponible", "disp", "d", "true", "1", "si", "sí", "libre"
  return ['disponible', 'disp', 'd', 'true', '1', 'si', 'sí', 'libre', 'available'].includes(s)
}

function normalizeRow(
  raw: Record<string, unknown>,
  mapper: ColumnMapper
): NormalizedUnit | null {
  const get = (field: keyof ColumnMapper) => {
    const col = mapper[field]
    return col ? raw[col] : undefined
  }

  const numero = String(get('numero') ?? '').trim()
  if (!numero) return null // skip rows without a unit number

  return {
    numero,
    piso: toInt(get('piso')),
    orientacion: get('orientacion') ? String(get('orientacion')).trim() || null : null,
    tipologia: get('tipologia') ? String(get('tipologia')).trim() || null : null,
    supInterior: toFloat(get('supInterior')),
    supTerraza: toFloat(get('supTerraza')),
    supTotal: toFloat(get('supTotal')),
    precioUf: toFloat(get('precioUf')),
    descuento: toFloat(get('descuento')),
    bonoPie: toFloat(get('bonoPie')),
    precioEstac: toFloat(get('precioEstac')),
    precioBodega: toFloat(get('precioBodega')),
    disponible: toDisponible(get('disponible')),
    rawData: raw,
  }
}

// ─── Main sync function ───────────────────────────────

export async function syncStock(stockSourceId: string): Promise<SyncResult> {
  const result: SyncResult = {
    rowsFound: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    errors: [],
  }

  const source = await prisma.stockSource.findUnique({
    where: { id: stockSourceId },
  })
  if (!source) throw new Error(`StockSource ${stockSourceId} not found`)

  const mapper = (source.columnMapper ?? {}) as ColumnMapper

  // Create a RUNNING log entry
  const log = await prisma.syncLog.create({
    data: {
      stockSourceId,
      status: 'RUNNING',
    },
  })

  try {
    // 1. Fetch raw rows from source
    let rawRows: Record<string, unknown>[]
    if (source.fileType === 'GOOGLE_SHEETS') {
      rawRows = await fetchFromGoogleSheets(source.driveFileId, source.sheetName)
    } else {
      rawRows = await fetchFromXlsx(source.driveFileId, source.sheetName)
    }

    result.rowsFound = rawRows.length

    // 2. Normalize and upsert
    for (const raw of rawRows) {
      const unit = normalizeRow(raw, mapper)
      if (!unit) {
        result.rowsSkipped++
        continue
      }

      const existing = await prisma.unit.findUnique({
        where: { stockSourceId_numero: { stockSourceId, numero: unit.numero } },
      })

      const data = {
        projectId: source.projectId,
        piso: unit.piso,
        orientacion: unit.orientacion,
        tipologia: unit.tipologia,
        supInterior: unit.supInterior,
        supTerraza: unit.supTerraza,
        supTotal: unit.supTotal,
        precioUf: unit.precioUf,
        descuento: unit.descuento,
        bonoPie: unit.bonoPie,
        precioEstac: unit.precioEstac,
        precioBodega: unit.precioBodega,
        disponible: unit.disponible,
        rawData: unit.rawData as Prisma.InputJsonValue,
      }

      if (existing) {
        await prisma.unit.update({ where: { id: existing.id }, data })
        result.rowsUpdated++
      } else {
        await prisma.unit.create({
          data: {
            stockSourceId,
            numero: unit.numero,
            ...data,
          },
        })
        result.rowsInserted++
      }
    }

    // 3. Update log + lastSyncAt
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        rowsFound: result.rowsFound,
        rowsInserted: result.rowsInserted,
        rowsUpdated: result.rowsUpdated,
        rowsSkipped: result.rowsSkipped,
        finishedAt: new Date(),
      },
    })
    await prisma.stockSource.update({
      where: { id: stockSourceId },
      data: { lastSyncAt: new Date() },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(msg)
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'ERROR',
        errorMessage: msg,
        rowsFound: result.rowsFound,
        rowsInserted: result.rowsInserted,
        rowsUpdated: result.rowsUpdated,
        rowsSkipped: result.rowsSkipped,
        finishedAt: new Date(),
      },
    })
    throw err
  }

  return result
}

// ─── Query helpers ────────────────────────────────────

export interface UnitFilters {
  projectId?: string
  tipologia?: string
  disponible?: boolean
  precioMin?: number
  precioMax?: number
  pisoMin?: number
  pisoMax?: number
}

export async function queryUnits(filters: UnitFilters) {
  const where: Prisma.UnitWhereInput = {}

  if (filters.projectId) where.projectId = filters.projectId
  if (filters.tipologia) where.tipologia = { contains: filters.tipologia, mode: 'insensitive' }
  if (filters.disponible !== undefined) where.disponible = filters.disponible
  if (filters.precioMin !== undefined || filters.precioMax !== undefined) {
    where.precioUf = {
      ...(filters.precioMin !== undefined ? { gte: filters.precioMin } : {}),
      ...(filters.precioMax !== undefined ? { lte: filters.precioMax } : {}),
    }
  }
  if (filters.pisoMin !== undefined || filters.pisoMax !== undefined) {
    where.piso = {
      ...(filters.pisoMin !== undefined ? { gte: filters.pisoMin } : {}),
      ...(filters.pisoMax !== undefined ? { lte: filters.pisoMax } : {}),
    }
  }

  return prisma.unit.findMany({
    where,
    orderBy: [{ piso: 'asc' }, { numero: 'asc' }],
    include: { project: { select: { name: true, slug: true } } },
  })
}
