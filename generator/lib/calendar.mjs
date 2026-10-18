// Pure functions over the contribution days (a port of the site's
// calendar-model.ts, so fig. 1 here and on kacpersaks.dev agree).
export const DAYS_PER_WEEK = 7
export const WEEKS = 53
const DAY_MS = 86_400_000
const MIN_TICK_GAP = 3
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const numberFormat = new Intl.NumberFormat('en-US')
export const formatCount = (value) => numberFormat.format(value)

const utc = (date) => new Date(`${date}T00:00:00Z`)

/** GitHub layout: one column per week, Sunday on row 0, nulls outside the range. */
export function buildWeeks(days) {
  if (days.length === 0) return []
  const leading = utc(days[0].date).getUTCDay()
  const trailing = (DAYS_PER_WEEK - ((leading + days.length) % DAYS_PER_WEEK)) % DAYS_PER_WEEK
  const cells = [...Array(leading).fill(null), ...days, ...Array(trailing).fill(null)]
  return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, col) =>
    cells.slice(col * DAYS_PER_WEEK, (col + 1) * DAYS_PER_WEEK)
  )
}

/** The trailing `count` weeks, padded with empty weeks at the start if short. */
export function lastWeeks(weeks, count) {
  const tail = weeks.slice(Math.max(0, weeks.length - count))
  const empty = Array(DAYS_PER_WEEK).fill(null)
  return [...Array.from({ length: count - tail.length }, () => empty), ...tail]
}

/** A label over every column holding the 1st of a month (+ the first column if it fits). */
export function monthTicks(weeks) {
  const ticks = weeks.flatMap((week, col) => {
    const first = week.find((d) => d !== null && utc(d.date).getUTCDate() === 1)
    return first ? [{ col, label: MONTHS[utc(first.date).getUTCMonth()] }] : []
  })
  const firstDay = weeks.flat().find((d) => d !== null)
  const leadFits = ticks.length === 0 || ticks[0].col >= MIN_TICK_GAP
  if (!firstDay || ticks[0]?.col === 0 || !leadFits) return ticks
  return [{ col: 0, label: MONTHS[utc(firstDay.date).getUTCMonth()] }, ...ticks]
}

function isNextDay(prev, next) {
  return utc(next.date).getTime() - utc(prev.date).getTime() === DAY_MS
}

function longestStreak(days) {
  return days.reduce(
    (acc, d) => {
      if (d.count === 0) return { ...acc, run: null, prev: d }
      const continues = acc.run !== null && acc.prev !== null && isNextDay(acc.prev, d)
      const run = continues ? { ...acc.run, days: acc.run.days + 1, to: d.date } : { days: 1, from: d.date, to: d.date }
      const best = acc.best === null || run.days > acc.best.days ? run : acc.best
      return { best, run, prev: d }
    },
    { best: null, run: null, prev: null }
  ).best
}

export function computeStats(days) {
  const busiest = days.reduce((best, d) => (d.count > 0 && (best === null || d.count > best.count) ? d : best), null)
  return {
    total: days.reduce((sum, d) => sum + d.count, 0),
    totalDays: days.length,
    activeDays: days.filter((d) => d.count > 0).length,
    longestStreak: longestStreak(days),
    busiestDay: busiest ? { date: busiest.date, count: busiest.count } : null,
  }
}

/** The count range GitHub actually assigned to each level in this data. */
export function legendEntries(days) {
  return [0, 1, 2, 3, 4].flatMap((level) => {
    const counts = days.filter((d) => d.level === level).map((d) => d.count)
    return counts.length === 0 ? [] : [{ level, min: Math.min(...counts), max: Math.max(...counts) }]
  })
}

export function legendRange({ min, max }) {
  return min === max ? formatCount(min) : `${formatCount(min)}–${formatCount(max)}`
}

/** "2025-11-06 → 12-06": the year is dropped from the end when it repeats. */
export function streakRange({ from, to }) {
  return to.slice(0, 4) === from.slice(0, 4) ? `${from} → ${to.slice(5)}` : `${from} → ${to}`
}
