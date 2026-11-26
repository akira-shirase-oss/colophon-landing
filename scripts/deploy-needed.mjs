// Says whether the live site is behind its Colophon project: prints `needed=true` or `needed=false` (and why
// on stderr), for the deploy workflow's schedule. The live site names the release it was built from in
// <meta name="colophon-generation">; the project's newest release is the delivery API's Colophon-Generation
// header. They differ after a publish in the Studio, until a deploy catches up.
//
//   node scripts/deploy-needed.mjs [site-url]
//
// A read that fails answers `needed=false` and exits 1: a deploy never starts from a guess.
const site = (process.argv[2] ?? 'https://colophon.404human.dev').replace(/\/+$/, '')
const api = (process.env.COLOPHON_API ?? 'https://colophonapp.404human.dev').replace(/\/+$/, '')
// The same default as src/lib/colophon.ts.
const project = process.env.COLOPHON_PROJECT ?? '01a2093b-bd4e-77e8-a5da-06ab1634576f'
const environment = process.env.COLOPHON_ENVIRONMENT ?? 'production'

const get = (url) => fetch(url, { headers: { 'user-agent': 'colophon-landing-deploy' }, cache: 'no-store', signal: AbortSignal.timeout(20_000) })

/** The release the live home page was built from; 0 when it names none. */
export function builtFrom(html) {
  const match = /<meta name="colophon-generation" content="(\d+)">/.exec(html)
  return match ? Number(match[1]) : 0
}

async function main() {
  const page = await get(`${site}/?deploy-check=${Date.now()}`)
  if (!page.ok) throw new Error(`${site}/ answered ${page.status}`)
  const live = builtFrom(await page.text())
  const head = await get(`${api}/content/v1/${project}/${environment}/posts?limit=1`)
  if (!head.ok) throw new Error(`the delivery API answered ${head.status}`)
  const newest = Number(head.headers.get('colophon-generation') ?? NaN)
  if (!Number.isSafeInteger(newest) || newest < 1) throw new Error('the delivery API named no release')
  console.error(`live site: release ${live}; project: release ${newest}`)
  console.log(`needed=${newest > live}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`deploy-needed: ${error.message}`)
    console.log('needed=false')
    process.exit(1)
  })
}
