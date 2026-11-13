// @ts-check
import { defineConfig } from 'astro/config'

// Static output: every section is plain HTML at build time, so search engines read the full page
// without running JavaScript. The few interactive pieces are small vanilla scripts.
export default defineConfig({
  output: 'static',
})
