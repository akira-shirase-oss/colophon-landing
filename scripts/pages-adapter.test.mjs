// The Cloudflare Pages adapter (adapter/pages.mjs) sends the worker exactly the on-demand routes: each static
// route as itself, with and without the trailing slash, and each dynamic one as the prefix before its parameter.
//
//   npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import pages, { BUILD_ROOT, routePatterns } from '../adapter/pages.mjs'

test('the site’s preview routes become the eight paths in _routes.json', () => {
  assert.deepEqual(routePatterns(['/api/preview', '/api/preview/exit', '/preview/posts/[id]', '/preview/pages/[id]', '/preview/home/[id]', '/preview/site/[id]']), [
    '/api/preview',
    '/api/preview/',
    '/api/preview/exit',
    '/api/preview/exit/',
    '/preview/home/*',
    '/preview/pages/*',
    '/preview/posts/*',
    '/preview/site/*',
  ])
})

test('a path a wildcard covers needs no rule of its own, and nothing is listed twice', () => {
  assert.deepEqual(routePatterns(['/preview/[collection]/[id]', '/preview/help', '/preview/help/']), ['/preview/*'])
  assert.deepEqual(routePatterns(['/a', '/a/', '/a']), ['/a', '/a/'])
  assert.deepEqual(routePatterns(['/[...all]']), ['/*'])
  assert.deepEqual(routePatterns([]), [])
})

test('a route outside the allowed prefixes that opts out of prerendering fails the build', () => {
  const resolved = pages({ onDemand: ['/api/preview', '/preview'] }).hooks['astro:routes:resolved']
  const route = (pattern, isPrerendered, origin = 'project', type = 'page') => ({ pattern, isPrerendered, origin, type })
  assert.doesNotThrow(() => resolved({ routes: [route('/', true), route('/blog/[...slug]', true), route('/api/preview', false), route('/api/preview/exit', false, 'project', 'endpoint'), route('/preview/posts/[id]', false), route('/_image', false, 'internal', 'endpoint')] }))
  for (const stray of ['/blog/[...slug]', '/', '/api/previews', '/api', '/previewer/[id]', '/api/other']) {
    assert.throws(() => resolved({ routes: [route('/api/preview', false), route(stray, false)] }), new RegExp(`only routes under /api/preview, /preview may render on demand`), stray)
  }
})

test('the build machine’s folder is renamed to one fixed root in the worker', () => {
  assert.equal(BUILD_ROOT, 'file:///site/')
})
