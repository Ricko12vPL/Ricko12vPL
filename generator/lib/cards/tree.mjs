// A tree section: a header image whose rule branches into a grid of cards.
// Every card has a narrow variant (384 px, one per line below the connected
// breakpoint) and a connected variant with its connector stubs baked in.
import { LAYOUT, MEDIA } from '../../config.mjs'
import { escapeHtml, render } from '../template.mjs'
import { headerDrops, layoutTree, tailDrops } from '../tree.mjs'
import { cardWires, sectionWires } from '../wires.mjs'

const SECTION = Object.freeze({ connectedHeight: 48, plainHeight: 40, ruleY: 9.5, barY: 30 })

export function frame({ mode, width, height, left, top, cardWidth, card, wires }) {
  return render('frame.html', { mode, width, height, left, top, cardWidth, card, wires })
}

function sectionHeader(section, drops, site) {
  const command = `<span class="sec-cmd"><span class="prompt-caret">›</span> ${escapeHtml(section.command)}</span>`
  const values = { index: section.index, name: section.name, inset: LAYOUT.insetX }
  const connected = render('section.html', {
    ...values,
    mode: 'wide',
    width: LAYOUT.full,
    height: SECTION.connectedHeight,
    command,
    wires: sectionWires({
      width: LAYOUT.full,
      height: SECTION.connectedHeight,
      ruleY: SECTION.ruleY,
      barY: SECTION.barY,
      drops,
    }),
  })
  const plain = render('section.html', {
    ...values,
    mode: 'narrow',
    width: LAYOUT.narrow,
    height: SECTION.plainHeight,
    command: '',
    wires: '',
  })
  return {
    id: `section-${section.id}`,
    alt: `${section.index} / ${section.name}`,
    href: `${site}${section.path}`,
    plain,
    wide: { html: connected, suffix: 'connected', media: MEDIA.connected },
  }
}

/** Narrow: the card alone at 384 px with transparent padding, one per line. */
export function narrowFrame(card, height) {
  const { insetX, plainPadY, narrow } = LAYOUT
  const cardWidth = narrow - 2 * insetX
  return frame({
    mode: 'narrow',
    width: narrow,
    height: height + 2 * plainPadY,
    left: insetX,
    top: plainPadY,
    cardWidth,
    card,
    wires: '',
  })
}

/** Connected: the card plus its connector stubs, for the wide tree. */
function connectedFrame(entry, item, row, { cardWidth, height: cardHeight }) {
  const { stub, jog } = LAYOUT
  const height = stub + cardHeight + (row.hasNext ? stub : 0)
  const center = item.frameWidth / 2
  return frame({
    mode: 'wide',
    width: item.frameWidth,
    height,
    left: center - cardWidth / 2,
    top: stub,
    cardWidth,
    card: entry.card('wide', cardHeight),
    wires: cardWires({
      width: item.frameWidth,
      height,
      cardTop: stub,
      cardBottom: stub + cardHeight,
      center,
      attachX: item.attachX - item.frameLeft,
      hasBottom: item.hasBottom,
      jog,
    }),
  })
}

/**
 * entries: [{ id, alt, href, card: (mode, height) => html }], all of one height
 * per mode (`heights: { wide, narrow }`). `tail(drops)` optionally returns a
 * final row of images fed from every card of the last row (fan-in or fan-out).
 * Returns { kind: 'section', header, rows: [[image, …], …] }.
 */
export function treeSection({ section, entries, heights, site, tail = null }) {
  const cell = LAYOUT.full / section.columns
  const cardWidth = cell - 2 * LAYOUT.insetX
  const rows = layoutTree(entries.length, section.columns, LAYOUT.full, { fanIn: Boolean(tail) })
  const images = rows.map((row) =>
    row.items.map((item) => {
      const entry = entries[item.index]
      return {
        id: entry.id,
        alt: entry.alt,
        href: entry.href,
        plain: narrowFrame(entry.card('narrow', heights.narrow), heights.narrow),
        wide: {
          html: connectedFrame(entry, item, row, { cardWidth, height: heights.wide }),
          suffix: 'connected',
          media: MEDIA.connected,
        },
      }
    })
  )
  const tailRow = tail ? [tail(tailDrops(rows))] : []
  return { kind: 'section', header: sectionHeader(section, headerDrops(rows), site), rows: [...images, ...tailRow] }
}
