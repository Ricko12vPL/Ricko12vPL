// Geist Mono + Geist Pixel Square from the `geist` npm package, embedded as
// data URIs so rendering never depends on file:// access or system fonts.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GENERATOR_ROOT } from './template.mjs'

const FONT_DIR = join(GENERATOR_ROOT, 'node_modules', 'geist', 'dist', 'fonts')

const FACES = [
  { family: 'Geist Mono', file: join('geist-mono', 'GeistMono-Variable.woff2'), weight: '100 900' },
  { family: 'Geist Pixel Square', file: join('geist-pixel', 'GeistPixel-Square.woff2'), weight: '400' },
]

export const FONT_FAMILIES = FACES.map((face) => face.family)

export function fontFaceCss() {
  return FACES.map(({ family, file, weight }) => {
    const data = readFileSync(join(FONT_DIR, file)).toString('base64')
    return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${data}) format('woff2');font-weight:${weight};font-style:normal;font-display:block;}`
  }).join('\n')
}
