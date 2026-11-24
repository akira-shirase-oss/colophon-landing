import type { APIRoute } from 'astro'
import { DOCS_URL } from '../data/app'
import { listedPages, type ListedPage } from '../lib/site-map'

// /llms.txt (llmstxt.org): a plain index of the site for language models, from the same list as the sitemap
// (src/lib/site-map.ts), so a page in one is in the other. check-dist compares the two on every build.
const ORDER: ListedPage['section'][] = ['Start here', 'Features', 'Comparisons', 'Use cases', 'Guides', 'Blog', 'Project']

export const GET: APIRoute = async ({ site }) => {
  const pages = await listedPages()
  const line = (p: ListedPage) => `- [${p.title.replace(/ \| Colophon$/, '')}](${new URL(p.path, site).href}): ${p.description}`
  const sections = ORDER.map((section) => {
    // A section's index first (/features/ before /features/publish-receipts/), then its pages as listed.
    const list = pages.filter((p) => p.section === section).sort((a, b) => a.path.split('/').length - b.path.split('/').length)
    return list.length ? `## ${section}\n\n${list.map(line).join('\n')}\n` : ''
  }).filter(Boolean)
  const text = `# Colophon

> Colophon is an open-source (MIT) headless CMS in Rust and Svelte, hosted or self-hosted with PostgreSQL. Every publish is a numbered release with a receipt, rollbacks are reviewed like any change, roles reach single fields, and AI agents connect through MCP by signing in and ask before they publish. It is live in alpha (0.1.0-alpha.7), with open sign-up at https://colophonapp.404human.dev.

## Docs

- [Documentation](${DOCS_URL}/): installing, the Studio, the API and API tokens.
- [Quick start](${DOCS_URL}/quick-start/): run Colophon locally with Docker.
- [Changelog](${DOCS_URL}/changelog/): what changed in each release.
- [Source code](https://github.com/akira-shirase-oss/colophon-cms): the repository, its roadmap and its issues.

${sections.join('\n')}`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
