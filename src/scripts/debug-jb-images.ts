// npx tsx src/scripts/debug-jb-images.ts
// Finds the actual image URL format used by JetBrokers browser app
import { config } from 'dotenv'
config({ path: '.env.local' })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function main() {
  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.default.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox'],
  })

  const page = await browser.newPage()
  const imageRequests: string[] = []

  // Capture ALL requests (images too)
  await page.setRequestInterception(true)
  page.on('request', req => {
    const url = req.url()
    const rt = req.resourceType()
    if (rt === 'image' || url.includes('cover') || url.includes('/file/')) {
      imageRequests.push(`[${rt}] ${url.replace('https://app.jetbrokers.io', '')}`)
    }
    req.continue()
  })

  // Login
  await page.goto('https://app.jetbrokers.io', { waitUntil: 'networkidle2', timeout: 25000 })
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })
  await page.evaluate((em, pw) => {
    const inputs = document.querySelectorAll('input')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(inputs[0], em); inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(inputs[1], pw); inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
  }, process.env.JETBROKERS_EMAIL, process.env.JETBROKERS_PASSWORD)
  await (await page.$('button'))!.click()
  await new Promise(r => setTimeout(r, 4000))

  // Navigate to marketplace to see project images
  console.log('Navigating to marketplace...')
  await page.goto('https://app.jetbrokers.io/marketplace', { waitUntil: 'networkidle2', timeout: 20000 })
  await new Promise(r => setTimeout(r, 3000))

  console.log('\n=== Image/file requests ===')
  imageRequests.forEach(r => console.log(r))

  // Also check what src attributes images have
  const imgSrcs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean).slice(0, 10)
  )
  console.log('\n=== Image src attributes on page ===')
  imgSrcs.forEach(s => console.log(s.replace('https://app.jetbrokers.io', '')))

  await browser.close()
}

main().catch(console.error)
