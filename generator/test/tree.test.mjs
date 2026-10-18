import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { headerDrops, layoutTree, tailDrops } from '../lib/tree.mjs'
import { cardWires, fanInWires, fanOutWires, sectionWires } from '../lib/wires.mjs'

describe('layoutTree', () => {
  it('fills full rows of three and chains every column', () => {
    const rows = layoutTree(9, 3, 744)
    assert.equal(rows.length, 3)
    assert.deepEqual(headerDrops(rows), [124, 372, 620])
    assert.deepEqual(rows[1].items.map((i) => i.attachX), [124, 372, 620])
    assert.ok(rows[0].items.every((i) => i.hasBottom))
    assert.ok(rows[2].items.every((i) => !i.hasBottom))
    assert.equal(rows[2].hasNext, false)
  })

  it('jogs a trailing pair in from the outer columns', () => {
    const rows = layoutTree(8, 3, 744)
    const last = rows[2].items
    assert.deepEqual(last.map((i) => [i.frameWidth, i.center, i.attachX]), [
      [372, 186, 124],
      [372, 558, 620],
    ])
    assert.deepEqual(rows[1].items.map((i) => i.hasBottom), [true, false, true])
  })

  it('drops a trailing single card straight down the middle', () => {
    const rows = layoutTree(7, 3, 744)
    assert.deepEqual(rows[2].items.map((i) => [i.center, i.attachX]), [[372, 372]])
    assert.deepEqual(rows[1].items.map((i) => i.hasBottom), [false, true, false])
  })

  it('handles two-column and single-card sections', () => {
    assert.deepEqual(headerDrops(layoutTree(2, 2, 744)), [186, 558])
    assert.deepEqual(headerDrops(layoutTree(1, 1, 744)), [372])
    assert.deepEqual(layoutTree(3, 2, 744)[1].items.map((i) => [i.center, i.attachX]), [[372, 186]])
  })

  it('gives every last-row card a bottom stub when a tail fans in', () => {
    const rows = layoutTree(8, 3, 744, { fanIn: true })
    assert.equal(rows[2].hasNext, true)
    assert.ok(rows[2].items.every((i) => i.hasBottom))
    assert.deepEqual(tailDrops(rows), [186, 558])
    // A single trailing card is fed from the middle column and still gets its stub.
    const single = layoutTree(7, 3, 744, { fanIn: true })
    assert.deepEqual(single[2].items.map((i) => [i.center, i.hasBottom]), [[372, true]])
    assert.deepEqual(single[1].items.map((i) => i.hasBottom), [false, true, false])
    assert.equal(layoutTree(8, 3, 744)[2].hasNext, false)
  })

  it('rejects impossible layouts', () => {
    assert.throws(() => layoutTree(0, 3, 744))
    assert.throws(() => layoutTree(3, 4, 744))
  })
})

describe('wires', () => {
  it('draws a straight stub when aligned and a jog otherwise', () => {
    const base = { width: 248, height: 192, cardTop: 14, cardBottom: 178, jog: 7 }
    const straight = cardWires({ ...base, center: 124, attachX: 124, hasBottom: true })
    assert.match(straight, /M124 0V14/)
    assert.match(straight, /M124 178V192/)
    const jog = cardWires({ ...base, center: 186, attachX: 124, hasBottom: false })
    assert.match(jog, /M124 0V7H186V14/)
    assert.doesNotMatch(jog, /V192/)
  })

  it('gathers a row into one tail card through the middle (fan-in)', () => {
    const svg = fanInWires({ width: 744, height: 88, drops: [186, 558], barY: 10, mid: 372, cardTop: 24 })
    assert.match(svg, /M186 0V10/)
    assert.match(svg, /M558 0V10/)
    assert.match(svg, /M186 10H558/)
    assert.match(svg, /M372 10V24/)
    const straight = fanInWires({ width: 744, height: 88, drops: [372], barY: 10, mid: 372, cardTop: 24 })
    assert.match(straight, /M372 0V24/)
    assert.doesNotMatch(straight, /H/)
  })

  it('feeds a row from one trunk, each frame showing its own slice (fan-out)', () => {
    const base = { width: 248, height: 70, trunkX: 372, drops: [124, 372, 620], barY: 10, cardTop: 24 }
    const middle = fanOutWires({ ...base, frameLeft: 248 })
    assert.match(middle, /viewBox="248 0 248 70"/)
    assert.match(middle, /M372 0V10/)
    assert.match(middle, /M124 10H620/)
    assert.equal((middle.match(/V24/g) ?? []).length, 3)
    assert.match(fanOutWires({ ...base, frameLeft: 0 }), /viewBox="0 0 248 70"/)
  })

  it('branches the section rule into every drop', () => {
    const svg = sectionWires({ width: 744, height: 48, ruleY: 9.5, barY: 30, drops: [124, 372, 620] })
    assert.match(svg, /M124 30H620/)
    assert.equal((svg.match(/V48/g) ?? []).length, 3)
    const single = sectionWires({ width: 744, height: 48, ruleY: 9.5, barY: 30, drops: [372] })
    assert.match(single, /M372 9.5V48/)
  })
})
