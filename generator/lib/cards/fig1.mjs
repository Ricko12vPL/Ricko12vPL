// fig. 1: the contribution calendar as a static glyph matrix.
import {
  DAYS_PER_WEEK,
  WEEKS,
  buildWeeks,
  computeStats,
  formatCount,
  lastWeeks,
  legendEntries,
  legendRange,
  monthTicks,
  streakRange,
} from '../calendar.mjs'
import { mulberry32 } from '../prng.mjs'
import { escapeHtml, render } from '../template.mjs'
import { blockImage, loginOf } from './common.mjs'

// Only characters Geist Mono actually has, so local and CI renders match
// (the site's half-width katakana would fall back to an OS font).
export const GLYPHS = Array.from('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ')
const DIM_GLYPH = '·'
const LEGEND_GLYPH = 'X'

/** One <span> per cell, in column order; nulls (outside the range) stay empty. */
function cellsHtml(weeks, random) {
  return weeks.flat().map((day) => {
    if (day === null) return '<span></span>'
    const glyph = day.level === 0 ? DIM_GLYPH : GLYPHS[Math.floor(random() * GLYPHS.length)]
    return `<span class="l${day.level}">${glyph}</span>`
  })
}

function ticksHtml(weeks, cell) {
  return monthTicks(weeks)
    .map((t) => `<span class="label" style="left:${t.col * cell}px">${escapeHtml(t.label)}</span>`)
    .join('')
}

function legendHtml(days) {
  return legendEntries(days)
    .map(
      (e) =>
        `<dd><span class="l${e.level}">${e.level === 0 ? DIM_GLYPH : LEGEND_GLYPH}</span><span>${escapeHtml(legendRange(e))}</span></dd>`
    )
    .join('')
}

function stat(label, value, note) {
  return `<div class="f1-stat"><dt class="label">${escapeHtml(label)}</dt><dd class="v num">${escapeHtml(value)}</dd><dd class="n">${escapeHtml(note)}</dd></div>`
}

function statsHtml(stats) {
  const share = stats.totalDays > 0 ? Math.round((stats.activeDays / stats.totalDays) * 100) : 0
  const streak = stats.longestStreak
  const busiest = stats.busiestDay
  return [
    stat('contributions', formatCount(stats.total), `${stats.totalDays} days`),
    stat('active days', formatCount(stats.activeDays), `${share}% of ${stats.totalDays}`),
    stat('longest streak', streak ? `${streak.days} d` : '—', streak ? streakRange(streak) : 'no active days'),
    stat('busiest day', busiest ? formatCount(busiest.count) : '—', busiest ? busiest.date : 'no active days'),
  ].join('')
}

/** The window ends the day before the check, so its last day is complete. */
export function fig1Alt(login, c, stats) {
  const streak = stats.longestStreak
    ? `longest streak ${stats.longestStreak.days} days (${stats.longestStreak.from} to ${stats.longestStreak.to})`
    : 'no streak'
  const busiest = stats.busiestDay
    ? `busiest day ${stats.busiestDay.date} with ${formatCount(stats.busiestDay.count)}`
    : 'no busiest day'
  return (
    `fig. 1 — GitHub contributions for ${login}, ${c.from} to ${c.to}: ` +
    `${formatCount(stats.total)} contributions on ${stats.activeDays} of ${stats.totalDays} days; ${streak}; ${busiest}. ` +
    `Source: GitHub public contribution calendar, through ${c.to}, checked ${c.checkedAt}.`
  )
}

// Narrow: 20 weeks of 15 px cells fit the 384 px card at a 15 px type floor.
const LAYOUTS = Object.freeze({
  wide: { weeks: WEEKS, cell: 12 },
  narrow: { weeks: 20, cell: 15 },
})

function wording(mode, { login, weeks, c }) {
  const source = `source: GitHub public contribution calendar for ${login}`
  if (mode === 'wide') {
    return {
      headLeft: `github activity · ${login}`,
      range: `${c.from} → ${c.to}`,
      caption: `contributions, last 12 months · ${source} · through ${c.to} · checked ${c.checkedAt}`,
    }
  }
  return {
    headLeft: login,
    range: `${weeks} wk`,
    caption: `GitHub contributions · grid: newest ${weeks} weeks · stats: last 12 months, ${c.from} → ${c.to} · ${source} · checked ${c.checkedAt}`,
  }
}

function fig1Body(data, seed, mode) {
  const c = data.contributions
  const { weeks: count, cell } = LAYOUTS[mode]
  const all = lastWeeks(buildWeeks(c.days), WEEKS)
  const weeks = lastWeeks(all, count)
  if (all.flat().length !== WEEKS * DAYS_PER_WEEK) throw new Error('fig. 1: grid is not 53 × 7')
  // Glyphs are drawn for the full 53-week grid so both layouts show the same
  // glyph on the same day; the narrow one keeps only the newest weeks.
  const glyphs = cellsHtml(all, mulberry32(seed)).slice((WEEKS - count) * DAYS_PER_WEEK)
  const login = loginOf(data.person.links.github)
  return render('fig1.html', {
    mode,
    weeks: count,
    cell,
    ...wording(mode, { login, weeks: count, c }),
    cells: glyphs.join(''),
    ticks: ticksHtml(weeks, cell),
    legend: legendHtml(c.days),
    stats: statsHtml(computeStats(c.days)),
  })
}

/** `seed` comes from the data hash, so the same data always draws the same glyphs. */
export function fig1Image(data, seed) {
  const c = data.contributions
  const login = loginOf(data.person.links.github)
  return blockImage({
    id: 'fig1',
    alt: fig1Alt(login, c, computeStats(c.days)),
    href: data.site,
    body: (mode) => fig1Body(data, seed, mode),
  })
}
