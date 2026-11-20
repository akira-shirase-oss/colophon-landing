// robots.txt allows every crawler, and each AI crawler named in it has a group of its own that allows it.
// The parser follows RFC 9309: a crawler obeys the one group whose user-agent matches its name (case-
// insensitively), else the `*` group; within a group the longest matching rule wins, Allow on a tie.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AI_CRAWLERS, robots } from '../src/data/robots.mjs'

/** Groups as { agents, rules: [{ allow, path }] }, plus the Sitemap lines. */
function parse(text) {
  const groups = []
  const sitemaps = []
  let current = null
  let lastWasAgent = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim()
    if (!line) continue
    const [key, ...rest] = line.split(':')
    const field = key.trim().toLowerCase()
    const value = rest.join(':').trim()
    if (field === 'user-agent') {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }))
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (field === 'sitemap') sitemaps.push(value)
      else if ((field === 'allow' || field === 'disallow') && current) current.rules.push({ allow: field === 'allow', path: value })
    }
  }
  return { groups, sitemaps }
}

/** Whether `agent` may fetch `path`. */
function allowed({ groups }, agent, path) {
  const named = groups.filter((g) => g.agents.includes(agent.toLowerCase()))
  const group = named.length ? named : groups.filter((g) => g.agents.includes('*'))
  const rules = group.flatMap((g) => g.rules).filter((r) => r.path && path.startsWith(r.path))
  if (!rules.length) return true
  const longest = Math.max(...rules.map((r) => r.path.length))
  return rules.filter((r) => r.path.length === longest).some((r) => r.allow)
}

const SITEMAP = 'https://colophon.404human.dev/sitemap.xml'
const file = parse(robots(SITEMAP))

test('every crawler may read every page', () => {
  for (const path of ['/', '/blog/', '/compare/colophon-vs-contentful/', '/llms.txt']) {
    assert.ok(allowed(file, 'SomeOtherBot', path), path)
  }
})

test('each AI crawler has a group naming it, and that group allows every page', () => {
  for (const bot of AI_CRAWLERS) {
    const own = file.groups.filter((g) => g.agents.includes(bot.toLowerCase()))
    assert.equal(own.length, 1, `${bot} has ${own.length} groups`)
    assert.deepEqual(own[0].rules, [{ allow: true, path: '/' }], `${bot}'s group`)
    for (const path of ['/', '/guides/', '/blog/load-testing-a-cms/']) assert.ok(allowed(file, bot, path), `${bot} ${path}`)
  }
})

test('the list names the crawlers this site wants to welcome', () => {
  for (const bot of ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']) {
    assert.ok(AI_CRAWLERS.includes(bot), bot)
  }
})

test('the sitemap line survives', () => {
  assert.deepEqual(file.sitemaps, [SITEMAP])
})

test('the parser would catch a named group that blocks its crawler', () => {
  const blocked = parse('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n')
  assert.equal(allowed(blocked, 'GPTBot', '/'), false)
  assert.equal(allowed(blocked, 'ClaudeBot', '/'), true)
  // A named group with no rules of its own doesn't inherit `*`'s; it allows everything by default.
  const bare = parse('User-agent: *\nDisallow: /private/\n\nUser-agent: GPTBot\n')
  assert.equal(allowed(bare, 'GPTBot', '/private/x'), true)
  assert.equal(allowed(bare, 'ClaudeBot', '/private/x'), false)
})
