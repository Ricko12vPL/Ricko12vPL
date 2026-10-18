// SVG connector strokes ("wires") drawn on top of the transparent frame
// around a card. Integer coordinates + 1px strokes stay crisp at 2x.
const MARK_W = 9
const MARK_H = 2
const JUNCTION = 5

const path = (d) => `<path class="w" d="${d}"/>`
const mark = (x, y) => `<rect class="m" x="${x - MARK_W / 2}" y="${y - MARK_H / 2}" width="${MARK_W}" height="${MARK_H}"/>`

function svg(width, height, parts, originX = 0) {
  return `<svg class="wires" width="${width}" height="${height}" viewBox="${originX} 0 ${width} ${height}" aria-hidden="true">${parts.join('')}</svg>`
}

const bar = (xs, y) => (xs.length > 1 ? [path(`M${Math.min(...xs)} ${y}H${Math.max(...xs)}`)] : [])

/**
 * Connectors around one card in a tree row.
 * top: from the frame top (at attachX) into the card top (at center), with a
 * jog when they differ; bottom: from the card bottom to the frame bottom.
 */
export function cardWires({ width, height, cardTop, cardBottom, center, attachX, hasBottom, jog }) {
  const top =
    attachX === center
      ? path(`M${center} 0V${cardTop}`)
      : path(`M${attachX} 0V${jog}H${center}V${cardTop}`)
  const bottom = hasBottom ? [path(`M${center} ${cardBottom}V${height}`), mark(center, cardBottom)] : []
  return svg(width, height, [top, mark(center, cardTop), ...bottom])
}

/**
 * The section header's branch: from the rule (at ruleY) down the middle,
 * across a bar spanning the drops, then one drop per first-row card.
 */
export function sectionWires({ width, height, ruleY, barY, drops }) {
  const mid = width / 2
  const junction = `<rect class="m" x="${mid - (JUNCTION - 1) / 2 - 0.5}" y="${ruleY - JUNCTION / 2}" width="${JUNCTION}" height="${JUNCTION}"/>`
  if (drops.length === 1) {
    return svg(width, height, [path(`M${drops[0]} ${ruleY}V${height}`), junction])
  }
  const left = Math.min(...drops)
  const right = Math.max(...drops)
  const branch = [path(`M${mid} ${ruleY}V${barY}`), path(`M${left} ${barY}H${right}`)]
  const legs = drops.map((x) => path(`M${x} ${barY}V${height}`))
  return svg(width, height, [...branch, ...legs, junction])
}

/**
 * A tail card gathering a whole row (fan-in): stubs from every upper card
 * (`drops`) down to a bar at barY, then one trunk at `mid` into the card top.
 * Drawn inside the tail's own full-width frame, never on an image seam.
 */
export function fanInWires({ width, height, drops, barY, mid, cardTop }) {
  if (drops.length === 1 && drops[0] === mid) {
    return svg(width, height, [path(`M${mid} 0V${cardTop}`), mark(mid, cardTop)])
  }
  const legs = drops.map((x) => path(`M${x} 0V${barY}`))
  return svg(width, height, [...legs, ...bar([...drops, mid], barY), path(`M${mid} ${barY}V${cardTop}`), mark(mid, cardTop)])
}

/**
 * A row fed by one card above (fan-out): a trunk at `trunkX` down to a bar at
 * barY, then one drop into every card of the row (`drops`). Coordinates are
 * absolute across the row; each frame shows its own slice (viewBox offset by
 * `frameLeft`), so the frames tile into one drawing.
 */
export function fanOutWires({ width, height, frameLeft, trunkX, drops, barY, cardTop }) {
  const legs = drops.map((x) => path(`M${x} ${barY}V${cardTop}`))
  const marks = drops.map((x) => mark(x, cardTop))
  const parts = [path(`M${trunkX} 0V${barY}`), ...bar([...drops, trunkX], barY), ...legs, ...marks]
  return svg(width, height, parts, frameLeft)
}
