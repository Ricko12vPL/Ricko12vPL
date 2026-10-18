import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/** A fresh deep copy of the fixture, safe to modify in a test. */
export function fixture() {
  return JSON.parse(readFileSync(join(HERE, 'fixtures', 'profile.json'), 'utf8'))
}

/** Deep copy with `edit(copy)` applied; tests stay free of shared mutation. */
export function withEdit(edit) {
  const copy = fixture()
  edit(copy)
  return copy
}
