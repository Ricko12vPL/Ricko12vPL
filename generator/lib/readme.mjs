// README.md from README.template.md: <picture> per image (dark/light, plus
// wide/connected variants from the wide breakpoint), at most one link per
// image, and a plain-text index of the same links for crawlers, keyboards and
// screen readers.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ASSETS_DIR } from '../config.mjs'
import { shortTitle } from './cards/common.mjs'
import { openSourceRepos } from './cards/entries.mjs'
import { assetName } from './document.mjs'
import { GENERATOR_ROOT, escapeHtml, fill } from './template.mjs'

const asset = (file) => `./${ASSETS_DIR}/${file}`

function sizeOf(sizes, id, suffix) {
  const dark = sizes.get(assetName(id, suffix, 'dark'))
  const light = sizes.get(assetName(id, suffix, 'light'))
  if (!dark || !light) throw new Error(`missing rendered size for ${assetName(id, suffix, '*')}`)
  if (dark.width !== light.width || dark.height !== light.height) {
    throw new Error(`${id} (${suffix ?? 'plain'}): dark ${dark.width}×${dark.height} != light ${light.width}×${light.height}`)
  }
  return dark
}

// Width only: GitHub's README CSS caps images at max-width: 100% without
// height: auto, so a height attribute would squash any image that scales down.
export function picture(image, sizes) {
  const plain = sizeOf(sizes, image.id, null)
  const wide = image.wide
    ? ['dark', 'light'].map((theme) => {
        const size = sizeOf(sizes, image.id, image.wide.suffix)
        const file = assetName(image.id, image.wide.suffix, theme)
        return `<source media="${image.wide.media} and (prefers-color-scheme: ${theme})" srcset="${asset(file)}" width="${size.width}" />`
      })
    : []
  const dark = `<source media="(prefers-color-scheme: dark)" srcset="${asset(assetName(image.id, null, 'dark'))}" />`
  const img = `<img src="${asset(assetName(image.id, null, 'light'))}" alt="${escapeHtml(image.alt)}" width="${plain.width}" align="top" />`
  return `<picture>${[...wide, dark, img].join('')}</picture>`
}

export function linked(image, sizes) {
  const pic = picture(image, sizes)
  return image.href ? `<a href="${escapeHtml(image.href)}">${pic}</a>` : pic
}

/**
 * No whitespace between images in a row: a space would break the connectors
 * and push the 3 × 248 px row past 744 px.
 */
function groupHtml(group, sizes) {
  if (group.kind === 'block') {
    const parts = group.header ? [group.header, group.image] : [group.image]
    return `<p align="center">${parts.map((image) => linked(image, sizes)).join('<br />')}</p>`
  }
  if (group.kind === 'section') {
    const rows = group.rows.map((row) => row.map((image) => linked(image, sizes)).join(''))
    return `<p align="center">${[linked(group.header, sizes), ...rows].join('<br />')}</p>`
  }
  return `<p align="center">${group.images.map((image) => linked(image, sizes)).join('')}</p>`
}

const escapeMd = (text) => text.replace(/[\\`*_[\]<>|]/g, (ch) => `\\${ch}`)
const escapeMdTitle = (text) => text.replace(/["\\]/g, (ch) => `\\${ch}`)
/** Short visible text, full title as the link title when it was shortened. */
const mdLink = (text, href, full = text) =>
  full === text ? `[${escapeMd(text)}](${href})` : `[${escapeMd(text)}](${href} "${escapeMdTitle(full)}")`

export function textIndex(data) {
  const papers = data.papers.map(
    (p) => `${mdLink(shortTitle(p.title), p.url, p.title)} (${p.status}, ${p.date}${p.doi ? `, ${mdLink('DOI', p.doi)}` : ''})`
  )
  // The one-liner, not the full title, as the hover text: it is the card's own wording.
  const projects = [
    ...data.projects.map((p) => mdLink(p.name, p.repo ?? p.url, p.oneLiner)),
    mdLink(`all ${data.counts.projects} projects`, `${data.site}/projects`),
  ]
  const openSource = openSourceRepos(data).map((repo) => mdLink(repo.name, repo.repo, repo.text))
  const posts = data.posts.map(
    (p) => `${mdLink(shortTitle(p.title), p.url, p.title)} (${p.date}${p.superseded ? ', superseded' : ''})`
  )
  const { links, email } = data.person
  const contact = [
    mdLink(new URL(links.site).host, links.site),
    mdLink('LinkedIn', links.linkedin),
    mdLink(email, `mailto:${email}`),
  ]
  const line = (label, items) => (items.length > 0 ? [`- **${label}:** ${items.join(' · ')}`] : [])
  return [
    ...line('Research', papers),
    ...line('Projects', projects),
    ...line('Open source', openSource),
    ...line('Log', posts),
    ...line('Contact', contact),
  ].join('\n')
}

/** Groups are written in document order, one paragraph each. */
export function buildReadme(groups, sizes, data) {
  const template = readFileSync(join(GENERATOR_ROOT, 'README.template.md'), 'utf8')
  return fill(template, {
    site: data.site,
    body: groups.map((g) => groupHtml(g, sizes)).join('\n\n'),
    index: textIndex(data),
  })
}
