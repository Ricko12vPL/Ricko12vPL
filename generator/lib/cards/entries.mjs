// Card entries for the tree sections: research, projects, open source, log.
import { CARD_HEIGHT, LAYOUT, MEDIA, OPEN_SOURCE, SECTIONS } from '../../config.mjs'
import { formatCount } from '../calendar.mjs'
import { escapeHtml, render } from '../template.mjs'
import { fanInWires } from '../wires.mjs'
import { glyphSvg, hostOf, monthOf, sentence, statusBadge } from './common.mjs'
import { linkTail } from './links.mjs'
import { frame, narrowFrame, treeSection } from './tree.mjs'

const label = (text) => `<span class="label">${escapeHtml(text)}</span>`

function projectEntry(p) {
  const destination = p.repo ? 'GitHub repository' : 'project page on kacpersaks.dev'
  return {
    id: `project-${p.slug}`,
    alt: `${p.name} — ${p.statusLabel.toLowerCase()}; started ${p.date}. ${sentence(p.oneLiner)} Opens the ${destination}.`,
    href: p.repo ?? p.url,
    card: (mode, height) =>
      render('project.html', {
        height,
        badge: statusBadge(p.status, p.statusLabel),
        date: `started ${monthOf(p.date)}`,
        name: p.name,
        text: p.oneLiner,
        tag: p.repo ? 'repo' : 'site',
        arrow: p.repo ? '↗' : '→',
      }),
  }
}

function openSourceEntry(repo) {
  return {
    id: `oss-${repo.id}`,
    alt: `${repo.name} — open-source repository on GitHub (${repo.language}); started ${repo.started}. ${sentence(repo.text)} Opens the GitHub repository.`,
    href: repo.repo,
    card: (mode, height) =>
      render('project.html', {
        height,
        badge: label(repo.language),
        date: `started ${repo.started}`,
        name: repo.name,
        text: repo.text,
        tag: 'repo',
        arrow: '↗',
      }),
  }
}

/** Allowlisted public repos not already shown as a featured project card. */
export function openSourceRepos(data, allowlist = OPEN_SOURCE) {
  const featured = new Set(data.projects.map((p) => p.repo?.toLowerCase()).filter(Boolean))
  return allowlist.filter((repo) => !featured.has(repo.repo.toLowerCase()))
}

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1)

/** The venue with the status word taken out ("Self-archived preprint" → "Self-archived"). */
function venueWithoutStatus(venue, status) {
  const word = status.replace('-', ' ')
  return venue
    .replace(new RegExp(`\\b${word}\\b`, 'i'), '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Paper wording: a venue that already says the status ("Self-archived
 * preprint") is not repeated next to the status badge, and a paper without a
 * DOI says so in the footer.
 */
export function paperWording(p) {
  const doi = p.doi ? p.doi.replace('https://doi.org/', '') : null
  const repeatsStatus = p.venue.toLowerCase().includes(p.status.replace('-', ' '))
  const rest = venueWithoutStatus(p.venue, p.status)
  const footer = doi ? `doi:${doi}` : ['no DOI', ...(repeatsStatus && rest ? [lowerFirst(rest)] : [])].join(' · ')
  const venueLine = doi || !repeatsStatus ? p.venue : null
  const altStatus = repeatsStatus ? lowerFirst(p.venue) : `${p.status.replace('-', ' ')}, ${p.venue}`
  return { doi, footer, venueLine, alt: `${p.title} — ${altStatus}, ${p.date}.${doi ? ` DOI ${doi}.` : ''}` }
}

function paperEntry(p) {
  const words = paperWording(p)
  return {
    id: `paper-${p.slug}`,
    alt: `${words.alt} Opens the research page on kacpersaks.dev.`,
    href: p.url,
    card: (mode, height) =>
      render('paper.html', {
        height,
        glyph: glyphSvg('preprint'),
        kind: p.status.replace('-', ' '),
        date: p.date,
        title: p.title,
        venue: words.venueLine ? `<div class="pp-venue" data-fit>${escapeHtml(words.venueLine)}</div>` : '',
        venueClass: words.venueLine ? '' : 'no-venue',
        authors: words.footer,
        tag: 'site',
      }),
  }
}

// Wide rows are one 26 px line; narrow rows are a date line plus two title lines.
const LOG = Object.freeze({ rowWide: 26, chromeWide: 64, rowNarrow: 80, chromeNarrow: 60 })

function logEntry(data) {
  const rows = data.posts
    .map(
      (post) =>
        `<li class="${post.superseded ? 'old' : ''}"><time>${escapeHtml(post.date)}</time><span class="t" data-fit>${escapeHtml(post.title)}</span>${post.superseded ? '<span class="tag">superseded</span>' : ''}</li>`
    )
    .join('')
  const listing = data.posts.map((post) => `${post.date} ${post.title}${post.superseded ? ' (superseded)' : ''}`)
  const n = data.posts.length
  const values = { shown: n, total: formatCount(data.counts.posts), rows }
  return {
    entry: {
      id: 'log',
      alt: `Latest posts: ${listing.join('; ')}. Opens the blog on kacpersaks.dev.`,
      href: `${data.site}/blog`,
      card: (mode, height) => render('log.html', { ...values, height }),
    },
    heights: { wide: LOG.chromeWide + LOG.rowWide * n, narrow: LOG.chromeNarrow + LOG.rowNarrow * n },
  }
}

// The projects tree closes on one card: the last row fans in to "all N projects".
const CTA = Object.freeze({ barY: 10, cardTop: 24, padBottom: 6, width: 248 })

function indexTail(data, drops) {
  const total = formatCount(data.counts.projects)
  const card = (mode, height) =>
    render('cta.html', { height, name: `all ${total} projects`, sub: 'status, dates and write-ups' })
  const { full, insetX } = LAYOUT
  const height = CTA.cardTop + CARD_HEIGHT.cta.wide + CTA.padBottom
  const cardWidth = CTA.width - 2 * insetX
  const mid = full / 2
  const wide = frame({
    mode: 'wide',
    width: full,
    height,
    left: mid - cardWidth / 2,
    top: CTA.cardTop,
    cardWidth,
    card: card('wide', CARD_HEIGHT.cta.wide),
    wires: fanInWires({ width: full, height, drops, barY: CTA.barY, mid, cardTop: CTA.cardTop }),
  })
  return [
    {
      id: 'project-index',
      alt: `All ${total} projects — the full index with status, dates and write-ups on ${hostOf(data.site)}.`,
      href: `${data.site}/projects`,
      plain: narrowFrame(card('narrow', CARD_HEIGHT.cta.narrow), CARD_HEIGHT.cta.narrow),
      wide: { html: wide, suffix: 'connected', media: MEDIA.connected },
    },
  ]
}

export function researchSection(data) {
  if (data.papers.length === 0) return null
  return treeSection({
    section: SECTIONS.research,
    entries: data.papers.map(paperEntry),
    heights: CARD_HEIGHT.paper,
    site: data.site,
  })
}

export function projectsSection(data) {
  return treeSection({
    section: SECTIONS.projects,
    entries: data.projects.map(projectEntry),
    heights: CARD_HEIGHT.project,
    site: data.site,
    tail: (drops) => indexTail(data, drops),
  })
}

export function openSourceSection(data, allowlist = OPEN_SOURCE) {
  const repos = openSourceRepos(data, allowlist)
  if (repos.length === 0) return null
  return treeSection({
    section: SECTIONS.openSource,
    entries: repos.map(openSourceEntry),
    heights: CARD_HEIGHT.project,
    site: data.site,
  })
}

/** The log card feeds the contact row; without posts there is no log section. */
export function logSection(data) {
  if (data.posts.length === 0) return null
  const { entry, heights } = logEntry(data)
  return treeSection({
    section: SECTIONS.log,
    entries: [entry],
    heights,
    site: data.site,
    tail: (drops) => linkTail(data, drops[0]),
  })
}
