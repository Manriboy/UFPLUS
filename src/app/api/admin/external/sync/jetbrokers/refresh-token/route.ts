// src/app/api/admin/external/sync/jetbrokers/refresh-token/route.ts
// Obtiene un Bearer token fresco de JetBrokers via Puppeteer headless.
// Requiere: JETBROKERS_EMAIL y JETBROKERS_PASSWORD en .env.local
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const JB_URL = 'https://app.jetbrokers.io'
const TIMEOUT = 30000

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const email = process.env.JETBROKERS_EMAIL
  const password = process.env.JETBROKERS_PASSWORD

  if (!email || !password) {
    return NextResponse.json({
      error: 'Faltan credenciales. Agrega JETBROKERS_EMAIL y JETBROKERS_PASSWORD en .env.local'
    }, { status: 400 })
  }

  let browser
  try {
    const puppeteer = await import('puppeteer-core')
    browser = await puppeteer.default.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()

    // Interceptar requests para capturar el Bearer token
    let capturedToken: string | null = null
    await page.setRequestInterception(true)
    page.on('request', req => {
      const auth = req.headers()['authorization']
      if (auth?.startsWith('Bearer ') && auth.length > 15) {
        const token = auth.replace('Bearer ', '').trim()
        if (token !== (process.env.JETBROKERS_TOKEN ?? '') && token.length >= 8) {
          capturedToken = token
        }
      }
      req.continue()
    })

    await page.goto(JB_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })

    // Esperar a que aparezca el formulario de login
    await page.waitForSelector('input[type="email"], input[type="text"][name*="email"], input[placeholder*="mail"], input[placeholder*="correo"]', { timeout: TIMEOUT })

    // Llenar email
    const emailInput = await page.$('input[type="email"]') ??
      await page.$('input[type="text"][name*="email"]') ??
      await page.$('input[placeholder*="mail"]') ??
      await page.$('input[placeholder*="correo"]')

    if (!emailInput) throw new Error('No se encontró el campo de email')
    await emailInput.click({ clickCount: 3 })
    await emailInput.type(email, { delay: 50 })

    // Llenar password
    const passwordInput = await page.$('input[type="password"]')
    if (!passwordInput) throw new Error('No se encontró el campo de contraseña')
    await passwordInput.click({ clickCount: 3 })
    await passwordInput.type(password, { delay: 50 })

    // Enviar formulario
    await passwordInput.press('Enter')

    // Esperar a que navegue o aparezca contenido autenticado
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUT }).catch(() => {})
    await new Promise(r => setTimeout(r, 3000))

    // Si no capturamos token via intercepción, buscar en localStorage/sessionStorage
    if (!capturedToken) {
      capturedToken = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!
          const val = localStorage.getItem(key) ?? ''
          if (val.length >= 8 && val.length <= 32 && /^[A-Za-z0-9_-]+$/.test(val)) {
            return val
          }
          try {
            const parsed = JSON.parse(val)
            if (parsed?.token) return String(parsed.token)
            if (parsed?.accessToken) return String(parsed.accessToken)
            if (parsed?.bearerToken) return String(parsed.bearerToken)
          } catch {}
        }
        return null
      })
    }

    if (!capturedToken) {
      throw new Error('No se pudo capturar el token. Verifica las credenciales.')
    }

    // Guardar token en BD y en proceso
    await prisma.setting.upsert({
      where: { key: 'jetbrokers_token' },
      create: { key: 'jetbrokers_token', value: capturedToken },
      update: { value: capturedToken },
    })

    // También actualizar env en memoria para requests inmediatos
    process.env.JETBROKERS_TOKEN = capturedToken

    return NextResponse.json({ ok: true, token: capturedToken.slice(0, 4) + '****' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}
