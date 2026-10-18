// Contact row: three 248 px chips on the card grid (744 px together), fed from
// the log card above by one trunk (fan-out). Narrow: one 384 px chip per line.
import { CARD_HEIGHT, LAYOUT, MEDIA } from '../../config.mjs'
import { render } from '../template.mjs'
import { fanOutWires } from '../wires.mjs'
import { hostOf } from './common.mjs'
import { frame, narrowFrame } from './tree.mjs'

const ICONS = {
  site: '<span class="pixel">KS</span>',
  linkedin:
    '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="1.5" y="1.5" width="15" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="4.6" y="7.6" width="2" height="5.9" fill="currentColor"/><circle cx="5.6" cy="5.2" r="1.15" fill="currentColor"/><path d="M8.4 7.6h1.9v.85c.42-.62 1.12-1.05 2.1-1.05 1.6 0 2.4 1.02 2.4 2.8v3.3h-2v-3.1c0-.88-.32-1.38-1.08-1.38-.8 0-1.32.58-1.32 1.5v2.98h-2z" fill="currentColor"/></svg>',
  email:
    '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="1.7" y="3.7" width="14.6" height="10.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.2 4.4 9 9.6l6.8-5.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
}

const ROW = Object.freeze({ cell: 248, barY: 10, cardTop: 24, padTop: 6, padBottom: 6 })

function chips(data) {
  const { links, email } = data.person
  const linkedinHandle = new URL(links.linkedin).pathname.split('/').filter(Boolean).at(-1)
  return [
    { id: 'site', icon: ICONS.site, label: hostOf(links.site), hint: 'site', alt: `${hostOf(links.site)} — personal site`, href: links.site },
    { id: 'linkedin', icon: ICONS.linkedin, label: 'LinkedIn', hint: linkedinHandle, alt: `LinkedIn — ${linkedinHandle}`, href: links.linkedin },
    { id: 'email', icon: ICONS.email, label: email, hint: 'mail', alt: `Email — ${email}`, href: `mailto:${email}` },
  ]
}

/** One chip in its 248 px cell; with `trunkX`, the fan-out wires are drawn on top. */
function wideChip(chip, index, trunkX) {
  const { insetX } = LAYOUT
  const cardWidth = ROW.cell - 2 * insetX
  const top = trunkX === null ? ROW.padTop : ROW.cardTop
  const height = top + CARD_HEIGHT.link.wide + ROW.padBottom
  const drops = [0, 1, 2].map((k) => ROW.cell * (k + 0.5))
  const wires =
    trunkX === null
      ? ''
      : fanOutWires({ width: ROW.cell, height, frameLeft: ROW.cell * index, trunkX, drops, barY: ROW.barY, cardTop: top })
  return frame({
    mode: 'wide',
    width: ROW.cell,
    height,
    left: insetX,
    top,
    cardWidth,
    card: render('link.html', { ...chip, height: CARD_HEIGHT.link.wide }),
    wires,
  })
}

/** The three contact chips as images; `trunkX` is where the feeding card's stub ends (or null). */
export function contactRow(data, trunkX = null) {
  return chips(data).map((chip, index) => ({
    id: `link-${chip.id}`,
    alt: chip.alt,
    href: chip.href,
    plain: narrowFrame(render('link.html', { ...chip, height: CARD_HEIGHT.link.narrow }), CARD_HEIGHT.link.narrow),
    wide: { html: wideChip(chip, index, trunkX), suffix: 'connected', media: MEDIA.connected },
  }))
}

/** The contact row as the tail of the log section, fed from the log card's stub. */
export function linkTail(data, trunkX) {
  return contactRow(data, trunkX)
}
