// The Studio handshake (src/lib/preview/listen.ts), run as the browser runs it: the script's own text,
// evaluated against a stub window. It posts to, and listens to, exactly the Studio's origin; and its hash is
// the one the preview routes' policy allows.
//
//   npm test
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { LISTEN_SCRIPT, LISTEN_SCRIPT_HASH } from '../src/lib/preview/listen.ts'

const STUDIO = 'https://cms.example'

/** Runs the script as an inline <script> with the given attributes, in a page that is framed or not. */
function run({ studioOrigin = STUDIO, previewing = 'true', framed = true, attributes = true } = {}) {
  const posted = []
  const listeners = []
  let reloads = 0
  const parent = { postMessage: (data, target) => posted.push({ data, target }) }
  const window = {
    addEventListener: (type, listener) => listeners.push({ type, listener }),
    location: { reload: () => (reloads += 1) },
  }
  window.parent = framed ? parent : window
  const script = { getAttribute: (name) => (attributes ? { 'data-studio-origin': studioOrigin, 'data-previewing': previewing }[name] ?? null : null) }
  new Function('window', 'document', LISTEN_SCRIPT)(window, { currentScript: script })
  const send = (origin, data) => listeners.filter((l) => l.type === 'message').forEach((l) => l.listener({ origin, data }))
  return { posted, listeners, send, reloads: () => reloads }
}

test('framed, it tells the Studio it is ready, at exactly the Studio’s origin', () => {
  assert.deepEqual(run().posted, [{ data: { type: 'colophon:preview-ready', previewing: true }, target: STUDIO }])
})

test('it reports previewing: false when the page holds no session', () => {
  for (const previewing of ['false', '', 'TRUE', 'yes']) {
    assert.deepEqual(run({ previewing }).posted, [{ data: { type: 'colophon:preview-ready', previewing: false }, target: STUDIO }], previewing)
  }
})

test('it posts nothing when the page is not framed', () => {
  const page = run({ framed: false })
  assert.deepEqual(page.posted, [])
  assert.equal(page.listeners.length, 1, 'it still listens: a new tab opened by the Studio is not framed')
})

test('it reloads on a draft-saved message from exactly the Studio’s origin, and on nothing else', () => {
  const page = run()
  const saved = { type: 'colophon:draft-saved', entry: 'e1', revision: 'r2' }
  for (const origin of ['https://evil.example', `${STUDIO}.evil.example`, 'https://cms.example:8443', 'http://cms.example', 'null', '', '*']) page.send(origin, saved)
  assert.equal(page.reloads(), 0, 'another origin is ignored')
  for (const data of [null, undefined, 'colophon:draft-saved', [], [saved], { type: 'colophon:draft-saved' }, { type: 'colophon:draft-saved', entry: 'e1' }, { type: 'colophon:draft-saved', entry: 1, revision: 'r' }, { type: 'colophon:preview-ready', entry: 'e', revision: 'r' }, { ...saved, type: 'draft-saved' }]) {
    page.send(STUDIO, data)
  }
  assert.equal(page.reloads(), 0, 'a message that is not a draft-saved is ignored')
  page.send(STUDIO, saved)
  page.send(STUDIO, { ...saved, extra: true })
  assert.equal(page.reloads(), 2)
})

test('it does nothing without the Studio’s origin on its element', () => {
  for (const page of [run({ attributes: false }), run({ studioOrigin: '' })]) {
    assert.deepEqual(page.posted, [])
    assert.equal(page.listeners.length, 0)
  }
})

test('it never posts to, or accepts, a wildcard', () => {
  assert.ok(!/['"`]\*['"`]/.test(LISTEN_SCRIPT), 'no "*" target in the script')
  assert.match(LISTEN_SCRIPT, /event\.origin !== studio/)
})

test('it stays light: it listens for messages only, observes nothing and stores nothing', () => {
  assert.deepEqual([...LISTEN_SCRIPT.matchAll(/addEventListener\('([a-z]+)'/g)].map((m) => m[1]), ['message'])
  assert.ok(!/IntersectionObserver|MutationObserver|setInterval|setTimeout|requestAnimationFrame|localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|eval\(|innerHTML/.test(LISTEN_SCRIPT))
})

test('the hash the preview policy allows is this script’s', () => {
  const hash = `'sha256-${createHash('sha256').update(LISTEN_SCRIPT, 'utf8').digest('base64')}'`
  assert.equal(LISTEN_SCRIPT_HASH, hash, `the handshake script changed: read it, then set LISTEN_SCRIPT_HASH in src/lib/preview/listen.ts to ${hash}`)
})
