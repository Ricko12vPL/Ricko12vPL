// The only module that writes to disk. Called once, after every image has
// rendered and the README is built, so a failure earlier leaves files untouched.
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ASSETS_DIR, HASH_FILE } from '../config.mjs'

// Files this generator owns; anything else in assets/ is left alone.
const GENERATED = /^(header|statusbar|terminal|fig1|log|(section|rule|paper|project|oss|link)-[a-z0-9-]+?)(-connected|-wide)?-(dark|light)\.png$/

export function readPreviousKey(repoRoot) {
  try {
    return readFileSync(join(repoRoot, ASSETS_DIR, HASH_FILE), 'utf8').trim()
  } catch {
    return null
  }
}

export function staleFiles(existing, keep) {
  return existing.filter((name) => GENERATED.test(name) && !keep.has(name))
}

export function writeOutputs(repoRoot, { rendered, readme, key }) {
  const dir = join(repoRoot, ASSETS_DIR)
  mkdirSync(dir, { recursive: true })
  const keep = new Set(rendered.map((r) => r.file))
  const stale = staleFiles(readdirSync(dir), keep)
  stale.forEach((name) => unlinkSync(join(dir, name)))
  rendered.forEach((r) => writeFileSync(join(dir, r.file), r.png))
  writeFileSync(join(repoRoot, 'README.md'), readme)
  writeFileSync(join(dir, HASH_FILE), `${key}\n`)
  return { written: rendered.length + 2, removed: stale }
}
