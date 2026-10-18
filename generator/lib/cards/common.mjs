// Shared pieces for the card builders.
import { LAYOUT, MEDIA, PROMPT_USER } from '../../config.mjs'
import { escapeHtml, render } from '../template.mjs'

const GLYPH_SVG = {
  completed: '<circle cx="5" cy="5" r="3.6" fill="currentColor"/>',
  'in-progress':
    '<circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 1.4A3.6 3.6 0 0 0 5 8.6Z" fill="currentColor"/>',
  paused: '<rect x="2.6" y="1.2" width="1.5" height="7.6" fill="currentColor"/><rect x="5.9" y="1.2" width="1.5" height="7.6" fill="currentColor"/>',
  archived: '<circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  preprint: '<rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="3.5" y="3.5" width="3" height="3" fill="currentColor"/>',
}

/** Status glyph drawn as SVG (Geist Mono has no ◐ or ‖, and fallbacks differ by OS). */
export function glyphSvg(kind) {
  const shape = GLYPH_SVG[kind]
  if (!shape) throw new Error(`no glyph for ${kind}`)
  return `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">${shape}</svg>`
}

export function statusBadge(status, label) {
  return `<span class="status status-${escapeHtml(status)}">${glyphSvg(status)}<span>${escapeHtml(label)}</span></span>`
}

export function prompt() {
  return `<span class="prompt-user">${escapeHtml(PROMPT_USER)}</span> <span class="prompt-path">~</span> <span class="prompt-caret">›</span>`
}

/** A block image (card inset so its edges align with the tree cards). */
export function block(content, width, mode) {
  return render('block.html', { width, inset: LAYOUT.insetX, content, mode })
}

/**
 * A full-width block in two layouts: `body(mode)` renders 'narrow' (384 px,
 * the plain fallback below the wide breakpoint) and 'wide' (744 px).
 */
export function blockImage({ id, alt, href, body }) {
  return {
    id,
    alt,
    href,
    plain: block(body('narrow'), LAYOUT.narrow, 'narrow'),
    wide: { html: block(body('wide'), LAYOUT.full, 'wide'), suffix: 'wide', media: MEDIA.wide },
  }
}

/** "2024-06-15" → "2024-06". */
export function monthOf(day) {
  return day.slice(0, 7)
}

/** Ends a sentence with a period unless it already ends in . … ! or ?. */
export function sentence(text) {
  return /[.…!?]$/.test(text) ? text : `${text}.`
}

export function hostOf(url) {
  return new URL(url).host
}

export function loginOf(githubUrl) {
  return new URL(githubUrl).pathname.split('/').filter(Boolean)[0]
}

/** "Worldclass Research Org: An Executable-Gate…" → "Worldclass Research Org". */
export function shortTitle(title) {
  const at = title.indexOf(':')
  return at === -1 ? title : title.slice(0, at).trim()
}
