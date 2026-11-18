// Renders the share image (public/og.jpg, 1200 × 630) from the built home page's own hero, so the card people
// see in a link preview is the page's sky, type and colours, not a separate drawing that can drift:
//
//   npm run build && node scripts/make-og.mjs
//
// It keeps the hero card in the light theme, drops the button (a picture can't be clicked), adds the logo
// top left, and writes a JPEG under 150 KB. Commit the result. Playwright is not a dependency: install it,
// or point PLAYWRIGHT_MODULE at an existing node_modules/playwright (see check-csp-browser.mjs).
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const out = join(root, 'public', 'og.jpg')
const LIMIT = 150 * 1024

const playwright = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright'
).catch(() => {
  console.error('make-og: Playwright not found. Install it, or set PLAYWRIGHT_MODULE.')
  process.exit(2)
})

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  let file = normalize(join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (file !== dist && !file.startsWith(dist + sep)) return void res.writeHead(403).end()
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))

const browser = await playwright.chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light', deviceScaleFactor: 1 })
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.evaluate(() => {
  const card = document.querySelector('main section > div')
  const logo = document.querySelector('header a[aria-label="Colophon home"]').cloneNode(true)
  card.querySelector('a[href*="github.com"]')?.remove()
  card.querySelector('[data-hero-field]')?.remove()
  card.querySelector('[data-print-title]')?.removeAttribute('data-print') // the share image shows it printed
  Object.assign(logo.style, { position: 'absolute', top: '44px', left: '56px', zIndex: '3', transform: 'scale(1.5)', transformOrigin: 'left top' })
  card.append(logo)
  Object.assign(card.style, { width: '1200px', maxWidth: 'none', height: '630px', borderRadius: '0', padding: '0' })
  const h1 = card.querySelector('h1')
  Object.assign(h1.style, { maxWidth: '1100px', fontSize: '78.95px' })
  card.querySelector('p').style.maxWidth = '720px'
  card.querySelector('p').style.fontSize = '24px'
  card.querySelector('p').style.lineHeight = '1.35'
  document.body.replaceChildren(card)
  Object.assign(document.body.style, { margin: '0', overflow: 'hidden' })
})
let quality = 86
let bytes
for (;;) {
  bytes = await page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: 1200, height: 630 } })
  if (bytes.length <= LIMIT || quality <= 60) break
  quality -= 4
}
await browser.close()
server.close()
if (bytes.length > LIMIT) {
  console.error(`make-og: ${bytes.length} bytes at quality ${quality}, over ${LIMIT}`)
  process.exit(1)
}
writeFileSync(out, bytes)
console.log(`make-og: public/og.jpg, 1200 × 630, ${(bytes.length / 1024).toFixed(1)} KB at JPEG quality ${quality}`)
