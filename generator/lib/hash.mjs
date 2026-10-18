// Canonical hashing: the data hash seeds fig. 1 and, together with a
// fingerprint of the generator itself, decides whether anything is re-rendered.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// Volatile fields that never reach an image: hashing them would re-render daily for nothing.
const VOLATILE_KEYS = new Set(['generatedAt'])

/** JSON with object keys sorted at every depth, so key order never changes the hash. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex')

export function dataHash(data) {
  const stable = Object.fromEntries(Object.entries(data).filter(([key]) => !VOLATILE_KEYS.has(key)))
  return sha256(canonicalJson(stable))
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)]))
    .sort()
}

/** Hash of the generator's own source (render.mjs, config, lib/, templates/, README template). */
export function generatorFingerprint(root) {
  const files = [
    join(root, 'render.mjs'),
    join(root, 'config.mjs'),
    join(root, 'README.template.md'),
    join(root, 'package-lock.json'),
    ...listFiles(join(root, 'lib')),
    ...listFiles(join(root, 'templates')),
  ]
  const parts = files.map((file) => `${relative(root, file)}\n${sha256(readFileSync(file))}`)
  return sha256(parts.join('\n'))
}

/** The value stored in assets/data-hash.txt. */
export function renderKey(data, fingerprint) {
  return `${dataHash(data)}.${fingerprint.slice(0, 16)}`
}
