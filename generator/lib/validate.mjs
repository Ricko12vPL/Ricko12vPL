// Strict validation of the profile.json contract (kacpersaks.dev/profile.json).
// Any problem means the generator exits 1 and writes nothing.
import { bool, day, instant, int, list, nullable, oneOf, shape, str, url } from './check.mjs'
import { computeStats } from './calendar.mjs'
import { OPEN_SOURCE } from '../config.mjs'

export const STATUS = Object.freeze({
  completed: { label: 'Completed', glyph: '●' },
  'in-progress': { label: 'In Progress', glyph: '◐' },
  paused: { label: 'Paused', glyph: '‖' },
  archived: { label: 'Archived', glyph: '○' },
})

// Only repositories cleared by the repo audit may be linked; anything else fails closed.
export const ALLOWED_REPOS = Object.freeze([
  'worldclass-research-org',
  'quantbrief',
  'claude-code-skills',
  'amazing_maze',
  'neo-triage-hack',
])
// Withdrawn X_Quant claims (honesty envelope): fail closed if they ever reappear.
const BANNED = [/\bsharpe\b/i, /\bPBO\b/, /\bIBKR\b/i, /interactive brokers/i]

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ONE_LINE = /^[^\n\r\t]*$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

function contractShape(site) {
  const text = (max) => str({ max, pattern: ONE_LINE })
  const project = (path, value) =>
    shape(path, value, {
      slug: str({ max: 80, pattern: SLUG }),
      name: text(60),
      title: text(160),
      oneLiner: text(110),
      status: oneOf(Object.keys(STATUS)),
      statusLabel: text(20),
      glyph: oneOf(Object.values(STATUS).map((s) => s.glyph)),
      date: day(),
      updated: nullable(day()),
      url: url({ prefix: `${site}/projects/` }),
      repo: nullable(url({ prefix: 'https://github.com/' })),
      priority: nullable(int({ min: 1, max: 999 })),
    })
  const paper = (path, value) =>
    shape(path, value, {
      slug: str({ max: 80, pattern: SLUG }),
      title: text(240),
      authors: list(text(80), { min: 1, max: 20 }),
      date: day(),
      venue: text(120),
      status: oneOf(['preprint', 'published', 'working-paper']),
      doi: nullable(url({ prefix: 'https://doi.org/10.' })),
      url: url({ prefix: `${site}/research/` }),
    })
  const post = (path, value) =>
    shape(path, value, {
      slug: str({ max: 120, pattern: SLUG }),
      title: text(160),
      date: day(),
      url: url({ prefix: `${site}/blog/` }),
      superseded: bool(),
    })
  const contributionDay = (path, value) =>
    shape(path, value, { date: day(), count: int({ max: 100_000 }), level: int({ max: 4 }) })
  const contributions = (path, value) =>
    shape(path, value, {
      checkedAt: day(),
      from: day(),
      to: day(),
      total: int(),
      activeDays: int({ max: 400 }),
      longestStreak: (p, v) => shape(p, v, { days: int({ max: 400 }), from: nullable(day()), to: nullable(day()) }),
      busiestDay: (p, v) => shape(p, v, { date: nullable(day()), count: int() }),
      days: list(contributionDay, { min: 1, max: 371 }),
    })
  return {
    generatedAt: instant(),
    site: url(),
    person: (path, value) =>
      shape(path, value, {
        name: text(60),
        role: text(80),
        location: text(80),
        tagline: text(300),
        email: str({ max: 120, pattern: /^[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}$/i }),
        links: (p, v) =>
          shape(p, v, {
            site: url(),
            github: url({ prefix: 'https://github.com/' }),
            linkedin: url({ prefix: 'https://linkedin.com/in/' }),
          }),
      }),
    counts: (path, value) =>
      shape(path, value, { projects: int({ max: 999 }), papers: int({ max: 999 }), posts: int({ max: 9999 }) }),
    projects: list(project, { min: 1, max: 12 }),
    papers: list(paper, { max: 12 }),
    posts: list(post, { max: 10 }),
    contributions,
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function unique(path, items, key) {
  const seen = items.map((item) => item[key])
  return seen.filter((v, i) => seen.indexOf(v) !== i).map((v) => `${path}: duplicate ${key} "${v}"`)
}

function projectRules(data) {
  const owner = data.person.links.github.replace(/\/+$/, '')
  return data.projects.flatMap((p, i) => {
    const path = `$.projects[${i}]`
    const expected = STATUS[p.status]
    const repoName = p.repo ? p.repo.slice(owner.length + 1).toLowerCase() : ''
    return [
      ...(p.glyph !== expected.glyph ? [`${path}.glyph: "${p.glyph}" does not match status ${p.status}`] : []),
      ...(p.statusLabel !== expected.label ? [`${path}.statusLabel: expected "${expected.label}"`] : []),
      ...(p.url !== `${data.site}/projects/${p.slug}` ? [`${path}.url: must be ${data.site}/projects/${p.slug}`] : []),
      ...(p.repo && !new RegExp(`^${escapeRegExp(owner)}/[A-Za-z0-9._-]+$`).test(p.repo)
        ? [`${path}.repo: must be a repository of ${owner}`]
        : []),
      ...(p.repo && !ALLOWED_REPOS.includes(repoName) ? [`${path}.repo: ${repoName} is not on the audited allowlist`] : []),
      ...(p.updated && p.updated < p.date ? [`${path}.updated: earlier than date`] : []),
    ]
  })
}

/** The static open-source list (config) is held to the same allowlist. */
function openSourceRules(entries, owner) {
  const repoPattern = new RegExp(`^${escapeRegExp(owner)}/([A-Za-z0-9._-]+)$`)
  const text = str({ max: 110, pattern: ONE_LINE })
  return [
    ...unique('open source', entries, 'id'),
    ...unique('open source', entries, 'repo'),
    ...entries.flatMap((entry, i) => {
      const path = `open source[${i}]`
      const match = typeof entry.repo === 'string' ? repoPattern.exec(entry.repo) : null
      const repoName = match ? match[1].toLowerCase() : ''
      return [
        ...shape(path, entry, {
          id: str({ max: 80, pattern: SLUG }),
          name: text,
          repo: url(),
          language: str({ max: 24, pattern: /^[A-Za-z0-9+#. -]+$/ }),
          started: str({ max: 7, pattern: MONTH }),
          text,
        }),
        ...(match ? [] : [`${path}.repo: must be a repository of ${owner}`]),
        ...(!ALLOWED_REPOS.includes(repoName) ? [`${path}.repo: ${repoName} is not on the audited allowlist`] : []),
        ...BANNED.filter((pattern) => pattern.test(`${entry.name} ${entry.text}`)).map(
          (pattern) => `${path}: withdrawn claim matched ${pattern} (honesty envelope)`
        ),
      ]
    }),
  ]
}

function contributionRules(c) {
  const path = '$.contributions'
  const stats = computeStats(c.days)
  const ordered = c.days.every((d, i) => i === 0 || Date.parse(d.date) - Date.parse(c.days[i - 1].date) === 86_400_000)
  const levelMismatch = c.days.findIndex((d) => (d.count === 0) !== (d.level === 0))
  const streak = stats.longestStreak
  const expectStreak = streak ?? { days: 0, from: null, to: null }
  const busiest = stats.busiestDay ?? { date: null, count: 0 }
  const problems = [
    [!ordered, 'days must be consecutive and ascending'],
    [levelMismatch !== -1, `days[${levelMismatch}]: level 0 must mean count 0 and vice versa`],
    [c.from !== c.days[0].date, 'from must equal the first day'],
    [c.to !== c.days.at(-1).date, 'to must equal the last day'],
    [c.checkedAt < c.to, 'checkedAt is earlier than the last day'],
    [c.total !== stats.total, `total ${c.total} != sum of days ${stats.total}`],
    [c.activeDays !== stats.activeDays, `activeDays ${c.activeDays} != ${stats.activeDays}`],
    [
      c.longestStreak.days !== expectStreak.days ||
        c.longestStreak.from !== expectStreak.from ||
        c.longestStreak.to !== expectStreak.to,
      `longestStreak does not match days (expected ${JSON.stringify(expectStreak)})`,
    ],
    [
      c.busiestDay.count !== busiest.count || c.busiestDay.date !== busiest.date,
      `busiestDay does not match days (expected ${JSON.stringify(busiest)})`,
    ],
  ]
  return problems.filter(([bad]) => bad).map(([, message]) => `${path}: ${message}`)
}

function stringsOf(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringsOf)
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf)
  return []
}

function honestyRules(data) {
  const texts = stringsOf([data.person, data.projects, data.papers, data.posts])
  return BANNED.flatMap((pattern) =>
    texts.some((t) => pattern.test(t)) ? [`$: withdrawn claim matched ${pattern} (honesty envelope)`] : []
  )
}

function crossRules(data, openSource) {
  const owner = data.person.links.github.replace(/\/+$/, '')
  return [
    ...(data.person.links.site !== data.site ? ['$.person.links.site: must equal $.site'] : []),
    ...(data.counts.projects < data.projects.length ? ['$.counts.projects: fewer than listed projects'] : []),
    ...(data.counts.papers < data.papers.length ? ['$.counts.papers: fewer than listed papers'] : []),
    ...(data.counts.posts < data.posts.length ? ['$.counts.posts: fewer than listed posts'] : []),
    ...unique('$.projects', data.projects, 'slug'),
    ...unique('$.papers', data.papers, 'slug'),
    ...unique('$.posts', data.posts, 'slug'),
    ...projectRules(data),
    ...contributionRules(data.contributions),
    ...honestyRules(data),
    ...openSourceRules(openSource, owner),
  ]
}

/**
 * Returns the list of problems; an empty list means the data is valid.
 * `openSource` defaults to the config allowlist and is checked with the data.
 */
export function validateProfile(data, { openSource = OPEN_SOURCE } = {}) {
  const siteCheck = url()('$.site', data?.site)
  const site = siteCheck.length === 0 ? data.site.replace(/\/+$/, '') : 'https://invalid.invalid'
  const structural = shape('$', data, contractShape(site))
  return structural.length > 0 ? structural : crossRules(data, openSource)
}
