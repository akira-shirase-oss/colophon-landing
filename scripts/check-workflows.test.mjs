// check-workflows fails a workflow GitHub can't parse (a `: ` in an unquoted name), which no line rule sees.
//
//   npm test
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url))
const script = join(repo, 'scripts', 'check-workflows.mjs')
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' })

test('the committed workflows pass, and an unquoted ": " in a job name fails as invalid YAML', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflows-'))
  cpSync(join(repo, '.github'), join(dir, '.github'), { recursive: true })
  assert.equal(run(dir).status, 0)
  const ci = join(dir, '.github', 'workflows', 'ci.yml')
  writeFileSync(ci, readFileSync(ci, 'utf8').replace(/^(\s+)name: site \(/m, '$1name: site: ('))
  const result = run(dir)
  rmSync(dir, { recursive: true, force: true })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /isn't valid YAML/)
})
