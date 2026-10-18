import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonicalJson, dataHash, renderKey } from '../lib/hash.mjs'
import { mulberry32, seedFromHex } from '../lib/prng.mjs'
import { fixture, withEdit } from './helpers.mjs'

describe('hashing', () => {
  it('is independent of key order', () => {
    assert.equal(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] }), canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }))
  })

  it('ignores generatedAt but not content', () => {
    const base = dataHash(fixture())
    assert.equal(dataHash(withEdit((d) => { d.generatedAt = '2030-01-01T00:00:00.000Z' })), base)
    assert.notEqual(dataHash(withEdit((d) => { d.counts.posts += 1 })), base)
  })

  it('folds the generator fingerprint into the render key', () => {
    const data = fixture()
    assert.notEqual(renderKey(data, 'a'.repeat(64)), renderKey(data, 'b'.repeat(64)))
    assert.match(renderKey(data, 'a'.repeat(64)), /^[0-9a-f]{64}\.a{16}$/)
  })
})

describe('prng', () => {
  it('repeats for the same seed and differs across seeds', () => {
    const take = (seed) => Array.from({ length: 5 }, mulberry32(seed))
    assert.deepEqual(take(42), take(42))
    assert.notDeepEqual(take(42), take(43))
    assert.ok(take(7).every((v) => v >= 0 && v < 1))
  })

  it('seeds from a hex digest and rejects anything else', () => {
    assert.equal(seedFromHex('ff000000abcdef'), 0xff000000)
    assert.throws(() => seedFromHex('not-hex'))
  })
})
