// The full-width intro blocks: header, status bar, terminal session, and the
// numbered rules above the terminal and fig. 1.
import { LAYOUT, MEDIA, OPEN_TO, PROMPT_USER, QUESTION, SHOW_OPEN_TO } from '../../config.mjs'
import { formatCount } from '../calendar.mjs'
import { escapeHtml, render } from '../template.mjs'
import { blockImage, hostOf, loginOf, prompt, shortTitle, statusBadge } from './common.mjs'

export function headerImage(data) {
  const { person } = data
  const openTo = SHOW_OPEN_TO
    ? `<p class="hd-open"><span class="dot"></span><span>${escapeHtml(OPEN_TO)}</span></p>`
    : ''
  const values = {
    siteHost: hostOf(data.site),
    login: loginOf(person.links.github),
    wordmark: person.name.toUpperCase(),
    role: person.role,
    location: person.location,
    prompt: prompt(),
    question: QUESTION,
    openTo,
  }
  const alt = [`${person.name} — ${person.role}, ${person.location}.`, QUESTION, ...(SHOW_OPEN_TO ? [OPEN_TO] : [])].join(
    ' '
  )
  return blockImage({ id: 'header', alt, href: data.site, body: (mode) => render('header.html', { ...values, mode }) })
}

export function statusbarImage(data) {
  const login = loginOf(data.person.links.github)
  const { projects, papers, posts } = data.counts
  const values = {
    path: `~/github/${login}`,
    projects: formatCount(projects),
    papers: formatCount(papers),
    posts: formatCount(posts),
  }
  const alt = `Status bar: ~/github/${login} — ${projects} projects, ${papers} papers, ${posts} posts on ${hostOf(data.site)}`
  return blockImage({ id: 'statusbar', alt, href: data.site, body: (mode) => render('statusbar.html', { ...values, mode }) })
}

function latestPaper(papers) {
  return [...papers].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

function nowRows(data) {
  const active = data.projects.filter((p) => p.status === 'in-progress')
  const paper = latestPaper(data.papers)
  const projectRows = active.map(
    (p) =>
      `<div class="tm-row">${statusBadge(p.status, p.statusLabel)}<span class="name">${escapeHtml(p.name)}</span></div>`
  )
  const paperRow = paper
    ? [
        `<div class="tm-row stack"><span class="tm-key">latest paper</span><span class="name clamp-1">${escapeHtml(shortTitle(paper.title))}</span></div>`,
      ]
    : []
  const rows = [...projectRows, ...paperRow]
  return rows.length > 0 ? rows.join('') : '<div class="tm-out">(empty)</div>'
}

function terminalAlt(data) {
  const active = data.projects.filter((p) => p.status === 'in-progress').map((p) => p.name)
  const paper = latestPaper(data.papers)
  const now = active.length > 0 ? `in progress — ${active.join(', ')}` : 'nothing in progress'
  return [
    `Terminal session. whoami: ${data.person.tagline}`,
    `Now: ${now}${paper ? `; latest paper — ${shortTitle(paper.title)}` : ''}.`,
  ].join(' ')
}

export function terminalImage(data) {
  const values = {
    user: PROMPT_USER,
    prompt: prompt(),
    tagline: data.person.tagline,
    nowRows: nowRows(data),
  }
  return blockImage({
    id: 'terminal',
    alt: terminalAlt(data),
    href: `${data.site}/projects`,
    body: (mode) => render('terminal.html', { ...values, mode }),
  })
}

const RULE = Object.freeze({ wideHeight: 30, narrowHeight: 40 })

/**
 * A section rule with no tree under it ("01 / whoami ──── › cat ~/.profile"),
 * shown above an intro block. Narrow: label and rule only. Linked like the
 * block under it (an unlinked README image would open the PNG itself).
 */
export function ruleImage(rule, command, href) {
  const values = { index: rule.index, name: rule.name, inset: LAYOUT.insetX, wires: '' }
  const cmd = `<span class="sec-cmd"><span class="prompt-caret">›</span> ${escapeHtml(command)}</span>`
  return {
    id: `rule-${rule.id}`,
    alt: `${rule.index} / ${rule.name}`,
    href,
    plain: render('section.html', { ...values, mode: 'narrow', width: LAYOUT.narrow, height: RULE.narrowHeight, command: '' }),
    wide: {
      html: render('section.html', { ...values, mode: 'wide', width: LAYOUT.full, height: RULE.wideHeight, command: cmd }),
      suffix: 'wide',
      media: MEDIA.wide,
    },
  }
}
