// The browser half of draft preview: the Studio handshake, as one small inline script.
//
// Vendored from `listenForDraftUpdates` in Colophon's SDK (packages/sdk/src/preview.ts of
// github.com/akira-shirase-oss/colophon-cms, MIT, commit 5c6eedd), rewritten as plain script text because the
// site ships no bundle for it. What it does is the SDK's, unchanged: when the page is framed it posts
// `{ type: 'colophon:preview-ready', previewing }` to `window.parent` with the Studio's exact origin as the
// target (never `*`), and it reloads the page on a `{ type: 'colophon:draft-saved', entry, revision }` message
// whose `event.origin` is exactly that origin, and on nothing else. `previewing: false` tells the Studio this
// page holds no preview session (its cookie was blocked in the frame), so it can offer "Open in a new tab".
//
// The Studio's origin and the flag arrive as attributes of the <script> element, so the text below is the
// same on every page and the Content-Security-Policy can allow it by hash. The origin is checked on the
// server before it is written (`originOf` in sdk.ts).
//
// Changing a character here changes the hash: read the script, then put the value `npm test` prints into
// LISTEN_SCRIPT_HASH (scripts/preview-listen.test.mjs evaluates the script in a stub window and pins the hash).
export const LISTEN_SCRIPT = `(function () {
  var script = document.currentScript
  var studio = script && script.getAttribute('data-studio-origin')
  if (!studio) return
  var previewing = script.getAttribute('data-previewing') === 'true'
  window.addEventListener('message', function (event) {
    if (event.origin !== studio) return
    var data = event.data
    if (typeof data === 'object' && data !== null && !Array.isArray(data) && data.type === 'colophon:draft-saved' && typeof data.entry === 'string' && typeof data.revision === 'string') {
      window.location.reload()
    }
  })
  var framed = false
  try {
    framed = window.parent !== window
  } catch (error) {
    framed = true
  }
  if (framed) window.parent.postMessage({ type: 'colophon:preview-ready', previewing: previewing }, studio)
})()`

/** The script's source expression for `script-src`: the SHA-256 of exactly the text above. */
export const LISTEN_SCRIPT_HASH = "'sha256-XQI4qukNi6YI1HcLewiYvaK03umSCSQbSyboINpjJdM='"
