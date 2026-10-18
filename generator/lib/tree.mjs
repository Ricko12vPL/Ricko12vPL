// Geometry of a "tree" section: a section header whose rule drops into a grid
// of cards, rows joined by vertical connectors (hancore-style). All x values are
// CSS px across the full README block width.

/** Which upper-row columns feed a partial last row of `m` items. */
function feedColumns(m, columns) {
  if (m === 1) return [Math.floor((columns - 1) / 2)]
  if (m === 2 && columns === 3) return [0, 2]
  return Array.from({ length: m }, (_, j) => j)
}

/**
 * Lays out `count` cards in rows of `columns` across `full` px.
 * Each item: { index, row, column, frameWidth, frameLeft, center, attachX, hasBottom }.
 * `center` and `attachX` are absolute; attachX is where the connector enters
 * from above (the header drop for row 0, the upper column line otherwise).
 * `fanIn`: every card of the last row also gets a bottom stub, for a tail
 * (see wires.mjs fanInWires) that gathers them into one card below.
 */
export function layoutTree(count, columns, full, { fanIn = false } = {}) {
  if (!Number.isInteger(count) || count < 1) throw new Error('layoutTree: count must be >= 1')
  if (![1, 2, 3].includes(columns)) throw new Error('layoutTree: columns must be 1, 2 or 3')
  const cell = full / columns
  const columnCenter = (k) => cell * (k + 0.5)
  const rowCount = Math.ceil(count / columns)
  const rows = Array.from({ length: rowCount }, (_, r) => {
    const size = Math.min(columns, count - r * columns)
    const partial = size < columns
    const frameWidth = partial ? full / size : cell
    const feeds = partial ? feedColumns(size, columns) : Array.from({ length: size }, (_, k) => k)
    const items = Array.from({ length: size }, (_, j) => {
      const center = frameWidth * (j + 0.5)
      return {
        index: r * columns + j,
        row: r,
        column: partial ? feeds[j] : j,
        frameWidth,
        frameLeft: frameWidth * j,
        center,
        attachX: r === 0 ? center : columnCenter(feeds[j]),
      }
    })
    return { items, feeds }
  })
  return rows.map((row, r) => {
    const next = rows[r + 1]
    const tail = !next && fanIn
    const fed = new Set(next ? next.feeds : [])
    const items = row.items.map((item) => ({ ...item, hasBottom: tail || fed.has(item.column) }))
    return { items, hasNext: Boolean(next) || tail }
  })
}

/** x positions where the section header's drops land (the first row's centers). */
export function headerDrops(rows) {
  return rows[0].items.map((item) => item.center)
}

/** x positions where the last row's bottom stubs leave (its cards' centers). */
export function tailDrops(rows) {
  return rows.at(-1).items.map((item) => item.center)
}
