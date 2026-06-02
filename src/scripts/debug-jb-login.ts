// npx tsx src/scripts/debug-jb-login.ts
import { config } from 'dotenv'
config({ path: '.env.local' })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function main() {
  const puppeteer = await import('puppeteer-core')
  const email = process.env.JETBROKERS_EMAIL!
  const password = process.env.JETBROKERS_PASSWORD!

  console.log('Launching browser...')
  const browser = await puppeteer.default.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  const apiLog: string[] = []

  // Log all API responses
  page.on('response', async res => {
    const url = res.url()
    if (!url.includes('/api/')) return
    try {
      const txt = await res.text()
      apiLog.push(`[${res.status()}] ${url.replace('https://app.jetbrokers.io', '')} → ${txt.slice(0, 200)}`)
    } catch {}
  })

  // Log all request Authorization headers
  await page.setRequestInterception(true)
  page.on('request', req => {
    const auth = req.headers()['authorization']
    if (auth) console.log('Request auth:', auth.slice(0, 30), req.url().replace('https://app.jetbrokers.io', '').slice(0, 50))
    req.continue()
  })

  console.log('Navigating to JetBrokers...')
  await page.goto('https://app.jetbrokers.io', { waitUntil: 'networkidle2', timeout: 25000 })

  console.log('Waiting for login form...')
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })

  // Angular requires native input events to trigger ng-model binding
  await page.evaluate((em, pw) => {
    const inputs = document.querySelectorAll('input')
    const emailInput = inputs[0] as HTMLInputElement
    const pwdInput = inputs[1] as HTMLInputElement

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    nativeInputValueSetter.call(emailInput, em)
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))
    emailInput.dispatchEvent(new Event('change', { bubbles: true }))

    nativeInputValueSetter.call(pwdInput, pw)
    pwdInput.dispatchEvent(new Event('input', { bubbles: true }))
    pwdInput.dispatchEvent(new Event('change', { bubbles: true }))
  }, email, password)

  await new Promise(r => setTimeout(r, 1000))

  // Click the submit button
  const btn = await page.$('button') ?? await page.$('input[type="submit"]')
  if (btn) {
    console.log('Clicking submit button...')
    await btn.click()
  } else {
    console.log('No button found, pressing Enter...')
    await page.$eval('input[type="password"]', (el: HTMLInputElement) => el.form?.submit())
  }

  console.log('Waiting for login response...')
  await new Promise(r => setTimeout(r, 7000))

  console.log('\n=== Final URL ===')
  console.log(page.url())

  console.log('\n=== Cookies ===')
  const cookies = await page.cookies()
  cookies.forEach(c => console.log(c.name, '=', c.value.slice(0, 30)))

  console.log('\n=== localStorage ===')
  const ls = await page.evaluate(() => {
    const result: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      result[k] = localStorage.getItem(k)?.slice(0, 100) ?? ''
    }
    return result
  })
  console.log(JSON.stringify(ls, null, 2))

  console.log('\n=== API calls ===')
  apiLog.forEach(l => console.log(l))

  await browser.close()
}

main().catch(console.error)
