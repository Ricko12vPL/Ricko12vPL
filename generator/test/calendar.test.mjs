import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  WEEKS,
  buildWeeks,
  computeStats,
  lastWeeks,
  legendEntries,
  legendRange,
  monthTicks,
  streakRange,
} from '../lib/calendar.mjs'
import { fixture } from './helpers.mjs'

const days = fixture().contributions.days

describe('calendar model', () => {
  it('lays the window out as 53 Sunday-first weeks', () => {
    const weeks = lastWeeks(buildWeeks(days), WEEKS)
    assert.equal(weeks.length, 53)
    assert.ok(weeks.every((week) => week.length === 7))
    // 364 complete days (2025-10-19 → 2026-10-17) fill 52 weeks; the first is padding.
    assert.ok(weeks[0].every((d) => d === null))
    assert.equal(weeks[1][0].date, '2025-10-19')
    assert.equal(new Date(`${weeks[1][0].date}T00:00:00Z`).getUTCDay(), 0)
  })

  it('pads short ranges with empty weeks at the start', () => {
    const weeks = lastWeeks(buildWeeks(days.slice(-10)), 4)
    assert.equal(weeks.length, 4)
    assert.ok(weeks[0].every((d) => d === null))
  })

  it('derives the stats of the complete days in profile.json', () => {
    const stats = computeStats(days)
    assert.equal(stats.total, 1936)
    assert.equal(stats.activeDays, 216)
    assert.deepEqual(stats.longestStreak, { days: 31, from: '2025-11-06', to: '2025-12-06' })
    assert.deepEqual(stats.busiestDay, { date: '2026-10-17', count: 193 })
  })

  it('handles a year without activity', () => {
    const stats = computeStats([{ date: '2026-01-01', count: 0, level: 0 }])
    assert.equal(stats.longestStreak, null)
    assert.equal(stats.busiestDay, null)
  })

  it('labels months on the column holding the 1st', () => {
    const ticks = monthTicks(lastWeeks(buildWeeks(days), WEEKS))
    assert.equal(ticks[0].label, 'Nov')
    assert.ok(ticks.some((t) => t.label === 'Oct'))
  })

  it('reports the real count range per level', () => {
    const legend = legendEntries(days)
    assert.deepEqual(legend[0], { level: 0, min: 0, max: 0 })
    assert.equal(legendRange({ min: 1, max: 13 }), '1–13')
    assert.equal(legendRange({ min: 5, max: 5 }), '5')
  })

  it('shortens streak ranges within one year', () => {
    assert.equal(streakRange({ from: '2025-11-06', to: '2025-12-06' }), '2025-11-06 → 12-06')
    assert.equal(streakRange({ from: '2025-12-30', to: '2026-01-02' }), '2025-12-30 → 2026-01-02')
  })
})
