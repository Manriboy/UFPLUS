// src/app/api/admin/external/sync/jetbrokers/daily/route.ts
// Sync diario: renueva el token de JetBrokers via Puppeteer (headless Chrome).
// El token fresco se usa para servir las imágenes vía proxy.
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const JB_URL = 'https://app.jetbrokers.io'
const TIMEOUT = 30000

async function renewTokenViaPuppeteer(email: string, password: string): Promise<string> {
  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.default.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    let capturedToken: string | null = null

    // Capturar token desde la respuesta de /api/auth/login
    page.on('response', async res => {
      try {
        if (!res.url().includes('/api/auth/login')) return
        const body = await res.json().catch(() => null)
        const t = body?.token
        if (t && typeof t === 'string' && t.length >= 6) capturedToken = t
      } catch {}
    })

    await page.goto(JB_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT })
    await page.waitForSelector('input[type="text"]', { timeout: TIMEOUT })

    // Angular requiere dispatchEvent nativo para detectar cambios en ng-model
    await page.evaluate((em, pw) => {
      const inputs = document.querySelectorAll('input')
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      const fire = (el: Element) => {
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      setter.call(inputs[0], em); fire(inputs[0])
      setter.call(inputs[1], pw); fire(inputs[1])
    }, email, password)

    await new Promise(r => setTimeout(r, 800))

    // Clic en el botón de submit
    const btn = await page.$('button')
    if (btn) await btn.click()
    else await (await page.$('input[type="password"]'))!.press('Enter')

    // Esperar a que se capture el token (máx 15s)
    const deadline = Date.now() + 15000
    while (!capturedToken && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 300))
    }

    // Fallback: leer desde localStorage
    if (!capturedToken) {
      capturedToken = await page.evaluate(() => {
        const raw = localStorage.getItem('broker-storage_broker-user-token')
        if (!raw) return null
        try { return JSON.parse(raw) } catch { return raw }
      })
    }

    if (!capturedToken) throw new Error('Login fallido. Verifica las credenciales en .env.local')
    return capturedToken
  } finally {
    await browser.close()
  }
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
        const email = process.env.JETBROKERS_EMAIL
        const password = process.env.JETBROKERS_PASSWORD

        if (!email || !password) {
          throw new Error('Faltan credenciales. Agrega JETBROKERS_EMAIL y JETBROKERS_PASSWORD en .env.local')
        }

        send(10, 'Abriendo sesión en JetBrokers...')
        const newToken = await renewTokenViaPuppeteer(email, password)

        send(80, 'Guardando token renovado...')
        await prisma.setting.upsert({
          where: { key: 'jetbrokers_token' },
          create: { key: 'jetbrokers_token', value: newToken },
          update: { value: newToken },
        })
        process.env.JETBROKERS_TOKEN = newToken

        send(100, `Token GCP renovado (${newToken.slice(0, 4)}****)`, { done: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        send(0, msg, { error: true })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  })
}
