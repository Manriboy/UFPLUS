// src/lib/stock-sync.ts

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
  descuento?: string   // solo usado si descuentoIndividual = true
  bonoPie?: string     // solo usado si bonoPieIndividual = true
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
  const b64 = process.env.GOOGLE_CREDENTIALS_BASE64
  if (b64) {
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    return new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    })
  }

  const raw = process.env.GOOGLE_PRIVATE_KEY
  if (!raw || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Missing Google service account credentials in environment')
  }
  const privateKey = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/^["']|["']$/g, '')
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

// ─── ExcelJS cell value extractor ─────────────────────

function cellToValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null
  if (typeof v === 'object') {
    if ('result' in v) return (v as ExcelJS.CellFormulaValue).result ?? null
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText?.map((r) => r.text).join('') ?? null
    if ('text' in v) return (v as ExcelJS.CellHyperlinkValue).text ?? null
    if (v instanceof Date) return v.toISOString()
  }
  return v
}

// ─── Header fetchers ──────────────────────────────────

/** Devuelve la lista de encabezados detectados desde la fila indicada */
export async function fetchHeaders(
  fileId: string,
  fileType: 'GOOGLE_SHEETS' | 'XLSX',
  sheetName?: string | null,
  headerRow = 1
): Promise<string[]> {
  if (fileType === 'GOOGLE_SHEETS') {
    return fetchSheetsHeaders(fileId, sheetName, headerRow)
  }
  return fetchXlsxHeaders(fileId, sheetName, headerRow)
}

async function fetchSheetsHeaders(
  fileId: string,
  sheetName?: string | null,
  headerRow = 1
): Promise<string[]> {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const rowRef = `${headerRow}:${headerRow}`
  const range = sheetName ? `${sheetName}!${rowRef}` : rowRef
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range })
  return (res.data.values?.[0] ?? [])
    .map((h) => String(h ?? '').trim())
    .filter(Boolean)
}

async function fetchXlsxHeaders(
  fileId: string,
  sheetName?: string | null,
  headerRow = 1
): Promise<string[]> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(response.data as Readable)
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]
  if (!sheet) throw new Error(`Hoja "${sheetName ?? 'primera hoja'}" no encontrada`)
  const row = sheet.getRow(headerRow)
  const headers: string[] = []
  row.eachCell((cell) => {
    const v = String(cellToValue(cell.value) ?? '').trim()
    if (v) headers.push(v)
  })
  return headers
}

// ─── Preview rows (first N data rows for mapper verification) ────────────────

export async function fetchPreviewRows(
  fileId: string,
  fileType: 'GOOGLE_SHEETS' | 'XLSX',
  sheetName?: string | null,
  headerRow = 1,
  limit = 3,
): Promise<Record<string, unknown>[]> {
  if (fileType === 'GOOGLE_SHEETS') {
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const range = sheetName ? `${sheetName}!A:ZZ` : 'A:ZZ'
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range })
    const rows = res.data.values ?? []
    if (rows.length <= headerRow) return []
    const headers = (rows[headerRow - 1] as string[]).map((h) => String(h ?? '').trim())
    return rows.slice(headerRow, headerRow + limit).map((row) => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { if (h) obj[h] = (row as unknown[])[i] ?? null })
      return obj
    })
  }

  // XLSX
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(response.data as Readable)
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]
  if (!sheet) return []

  let headers: string[] = []
  const result: Record<string, unknown>[] = []

  sheet.eachRow((row, rowNumber) => {
    if (result.length >= limit) return
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToValue)
    if (rowNumber === headerRow) {
      headers = values.map((c) => String(c ?? '').trim())
    } else if (rowNumber > headerRow) {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { if (h) obj[h] = values[i] ?? null })
      result.push(obj)
    }
  })
  return result
}

// ─── Row fetchers ─────────────────────────────────────

async function fetchFromGoogleSheets(
  fileId: string,
  sheetName?: string | null,
  headerRow = 1
): Promise<Record<string, unknown>[]> {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const range = sheetName ? `${sheetName}!A:ZZ` : 'A:ZZ'
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: fileId, range })
  const rows = res.data.values ?? []
  if (rows.length < headerRow) return []
  const headers = (rows[headerRow - 1] as string[]).map((h) => String(h ?? '').trim())
  return rows.slice(headerRow).map((row) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = (row as unknown[])[i] ?? null })
    return obj
  })
}

async function fetchFromXlsx(
  fileId: string,
  sheetName?: string | null,
  headerRow = 1
): Promise<Record<string, unknown>[]> {
  const auth = getGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(response.data as Readable)
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0]
  if (!sheet) throw new Error(`Hoja "${sheetName ?? 'primera hoja'}" no encontrada`)

  const rows: Record<string, unknown>[] = []
  let headers: string[] = []

  sheet.eachRow((row, rowNumber) => {
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToValue)
    if (rowNumber === headerRow) {
      headers = values.map((c) => String(c ?? '').trim())
    } else if (rowNumber > headerRow) {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { obj[h] = values[i] ?? null })
      rows.push(obj)
    }
  })

  return rows
}

// ─── Normalization helpers ─────────────────────────────

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).trim()

  // Formato chileno: punto como separador de miles, coma como decimal
  // Ej: "4.356" = 4356 | "4.356,78" = 4356.78 | "4,5" = 4.5 | "4500" = 4500
  let normalized: string
  if (s.includes(',') && s.includes('.')) {
    // Ambos presentes: punto = miles, coma = decimal
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    // Solo coma: separador decimal
    normalized = s.replace(',', '.')
  } else if (s.includes('.')) {
    const parts = s.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // Punto como separador de miles (ej: "4.356" o "1.234.567")
      normalized = s.replace(/\./g, '')
    } else {
      // Punto como decimal (ej: "4.5")
      normalized = s
    }
  } else {
    normalized = s
  }

  const n = parseFloat(normalized.replace(/[^\d.-]/g, ''))
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
  return ['disponible', 'disp', 'd', 'true', '1', 'si', 'sí', 'libre', 'available'].includes(s)
}

function normalizeRow(
  raw: Record<string, unknown>,
  mapper: ColumnMapper,
  descuentoIndividual: boolean,
  descuentoValor: number | null,
  bonoPieIndividual: boolean,
  bonoPieValor: number | null,
): NormalizedUnit | null {
  const get = (field: keyof ColumnMapper) => {
    const col = mapper[field]
    return col ? raw[col] : undefined
  }

  const numero = String(get('numero') ?? '').trim()
  if (!numero) return null

  return {
    numero,
    piso: toInt(get('piso')),
    orientacion: get('orientacion') ? String(get('orientacion')).trim() || null : null,
    tipologia: get('tipologia') ? String(get('tipologia')).trim() || null : null,
    supInterior: toFloat(get('supInterior')),
    supTerraza: toFloat(get('supTerraza')),
    supTotal: toFloat(get('supTotal')),
    precioUf: toFloat(get('precioUf')),
    descuento: descuentoIndividual ? toFloat(get('descuento')) : descuentoValor,
    bonoPie: bonoPieIndividual ? toFloat(get('bonoPie')) : bonoPieValor,
    disponible: toDisponible(get('disponible')),
    rawData: raw,
  }
}

// ─── Main sync ────────────────────────────────────────

export async function syncStock(stockSourceId: string): Promise<SyncResult> {
  const result: SyncResult = { rowsFound: 0, rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0, errors: [] }

  const source = await prisma.stockSource.findUnique({ where: { id: stockSourceId } })
  if (!source) throw new Error(`StockSource ${stockSourceId} no encontrado`)

  const mapper = (source.columnMapper ?? {}) as ColumnMapper
  const log = await prisma.syncLog.create({ data: { stockSourceId, status: 'RUNNING' } })

  try {
    let rawRows: Record<string, unknown>[]
    if (source.fileType === 'GOOGLE_SHEETS') {
      rawRows = await fetchFromGoogleSheets(source.driveFileId, source.sheetName, source.headerRow)
    } else {
      rawRows = await fetchFromXlsx(source.driveFileId, source.sheetName, source.headerRow)
    }

    result.rowsFound = rawRows.length

    for (const raw of rawRows) {
      const unit = normalizeRow(
        raw, mapper,
        source.descuentoIndividual, source.descuentoValor,
        source.bonoPieIndividual, source.bonoPieValor,
      )
      if (!unit) { result.rowsSkipped++; continue }

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
        disponible: unit.disponible,
        rawData: unit.rawData as Prisma.InputJsonValue,
      }

      if (existing) {
        await prisma.unit.update({ where: { id: existing.id }, data })
        result.rowsUpdated++
      } else {
        await prisma.unit.create({ data: { stockSourceId, numero: unit.numero, ...data } })
        result.rowsInserted++
      }
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'SUCCESS', rowsFound: result.rowsFound, rowsInserted: result.rowsInserted, rowsUpdated: result.rowsUpdated, rowsSkipped: result.rowsSkipped, finishedAt: new Date() },
    })
    await prisma.stockSource.update({ where: { id: stockSourceId }, data: { lastSyncAt: new Date() } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(msg)
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'ERROR', errorMessage: msg, rowsFound: result.rowsFound, rowsInserted: result.rowsInserted, rowsUpdated: result.rowsUpdated, rowsSkipped: result.rowsSkipped, finishedAt: new Date() },
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
