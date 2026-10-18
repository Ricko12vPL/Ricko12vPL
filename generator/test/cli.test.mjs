import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgs } from '../lib/args.mjs'
import { generatorFingerprint, renderKey } from '../lib/hash.mjs'
import { loadProfile } from '../lib/load.mjs'
import { readPreviousKey, writeOutputs } from '../lib/output.mjs'
import { fixture } from './helpers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE = join(ROOT, 'test', 'fixtures', 'profile.json')
const scratch = mkdtempSync(join(tmpdir(), 'profile-gen-'))
after(() => rmSync(scratch, { recursive: true, force: true }))

function run(args) {
  return spawnSync(process.execPath, [join(ROOT, 'render.mjs'), ...args], { encoding: 'utf8', env: { ...process.env } })
}

function tempDir(name) {
  const dir = join(scratch, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('render.mjs (fail closed)', () => {
  it('validates the fixture without writing', () => {
    const out = tempDir('validate')
    const result = run(['--data', FIXTURE, '--validate-only', '--out', out])
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(readdirSync(out), [])
  })

  it('exits 1 on invalid data and writes nothing', () => {
    const out = tempDir('invalid')
    const bad = join(scratch, 'bad.json')
    writeFileSync(bad, JSON.stringify({ ...fixture(), counts: { projects: 'many' } }))
    const result = run(['--data', bad, '--out', out, '--force'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /failed validation/)
    assert.deepEqual(readdirSync(out), [])
  })

  it('exits 1 on unreadable or malformed input and unknown flags', () => {
    assert.equal(run(['--data', join(scratch, 'missing.json')]).status, 1)
    const broken = join(scratch, 'broken.json')
    writeFileSync(broken, '{ not json')
    assert.match(run(['--data', broken]).stderr, /invalid JSON/)
    assert.equal(run(['--bogus']).status, 1)
  })

  it('skips everything when the render key is unchanged', () => {
    const out = tempDir('unchanged')
    mkdirSync(join(out, 'assets'))
    const key = renderKey(fixture(), generatorFingerprint(ROOT))
    writeFileSync(join(out, 'assets', 'data-hash.txt'), `${key}\n`)
    const result = run(['--data', FIXTURE, '--out', out])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /unchanged/)
    assert.equal(existsSync(join(out, 'README.md')), false)
  })
})

describe('io helpers', () => {
  it('parses flags strictly', () => {
    assert.deepEqual(parseArgs(['--data', 'x.json', '--force']), {
      data: 'x.json',
      out: null,
      force: true,
      validateOnly: false,
      help: false,
    })
    assert.throws(() => parseArgs(['--nope']))
  })

  it('loads a local profile and refuses plain http', async () => {
    const { data, source } = await loadProfile({ dataFile: FIXTURE })
    assert.equal(source, FIXTURE)
    assert.equal(data.site, 'https://kacpersaks.dev')
    await assert.rejects(loadProfile({ url: 'http://kacpersaks.dev/profile.json' }), /https/)
  })

  it('writes outputs, records the key and removes only stale generated files', () => {
    const out = tempDir('write')
    mkdirSync(join(out, 'assets'))
    writeFileSync(join(out, 'assets', 'project-gone-dark.png'), 'old')
    writeFileSync(join(out, 'assets', 'keep-me.svg'), 'mine')
    const rendered = [{ file: 'header-dark.png', png: Buffer.from('png') }]
    const result = writeOutputs(out, { rendered, readme: '# hi\n', key: 'abc.def' })
    assert.deepEqual(result.removed, ['project-gone-dark.png'])
    assert.deepEqual(readdirSync(join(out, 'assets')).sort(), ['data-hash.txt', 'header-dark.png', 'keep-me.svg'])
    assert.equal(readFileSync(join(out, 'README.md'), 'utf8'), '# hi\n')
    assert.equal(readPreviousKey(out), 'abc.def')
    assert.equal(readPreviousKey(join(out, 'nowhere')), null)
  })
})
