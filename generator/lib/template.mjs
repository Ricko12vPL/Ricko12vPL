// Minimal templating: {{key}} is HTML-escaped, {{{key}}} is inserted raw.
// A placeholder without a value is an error (fail closed, never "undefined").
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const GENERATOR_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE_DIR = join(GENERATOR_ROOT, 'templates')

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

export const TEMPLATES = Object.freeze(
  Object.fromEntries(
    readdirSync(TEMPLATE_DIR)
      .filter((name) => name.endsWith('.html') || name.endsWith('.css'))
      .map((name) => [name, readFileSync(join(TEMPLATE_DIR, name), 'utf8')])
  )
)

export function fill(template, values) {
  return template.replace(/\{\{(\{)?\s*([a-zA-Z0-9_]+)\s*\}?\}\}/g, (match, raw, key) => {
    if (!Object.hasOwn(values, key) || values[key] === undefined || values[key] === null) {
      throw new Error(`template value missing: ${key}`)
    }
    return raw ? String(values[key]) : escapeHtml(values[key])
  })
}

export function render(name, values) {
  const template = TEMPLATES[name]
  if (template === undefined) throw new Error(`unknown template: ${name}`)
  return fill(template, values)
}
