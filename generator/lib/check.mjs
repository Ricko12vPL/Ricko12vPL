// Tiny composable checks. Each returns a list of problems ("path: message");
// an empty list means the value is valid. Nothing throws, nothing mutates.
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

const typeName = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)
const fail = (path, message) => [`${path}: ${message}`]

export function isPlainObject(value) {
  return typeName(value) === 'object'
}

/** Exact key set: missing keys and unknown keys are both problems. */
export function shape(path, value, fields) {
  if (!isPlainObject(value)) return fail(path, `expected object, got ${typeName(value)}`)
  const unknown = Object.keys(value)
    .filter((key) => !Object.hasOwn(fields, key))
    .flatMap((key) => fail(`${path}.${key}`, 'unknown key'))
  const checked = Object.entries(fields).flatMap(([key, check]) =>
    Object.hasOwn(value, key) ? check(`${path}.${key}`, value[key]) : fail(`${path}.${key}`, 'missing')
  )
  return [...unknown, ...checked]
}

export function str({ min = 1, max = 500, pattern } = {}) {
  return (path, value) => {
    if (typeof value !== 'string') return fail(path, `expected string, got ${typeName(value)}`)
    if (value.length < min) return fail(path, `shorter than ${min}`)
    if (value.length > max) return fail(path, `longer than ${max} (${value.length})`)
    if (value !== value.trim()) return fail(path, 'leading or trailing whitespace')
    if (pattern && !pattern.test(value)) return fail(path, `does not match ${pattern}`)
    return []
  }
}

export function int({ min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  return (path, value) => {
    if (!Number.isInteger(value)) return fail(path, `expected integer, got ${typeName(value)}`)
    if (value < min || value > max) return fail(path, `outside [${min}, ${max}]`)
    return []
  }
}

export function bool() {
  return (path, value) => (typeof value === 'boolean' ? [] : fail(path, `expected boolean, got ${typeName(value)}`))
}

export function oneOf(values) {
  return (path, value) => (values.includes(value) ? [] : fail(path, `expected one of ${values.join(', ')}`))
}

/** A real calendar day in YYYY-MM-DD form (rejects 2026-02-30). */
export function day() {
  return (path, value) => {
    if (typeof value !== 'string' || !ISO_DAY.test(value)) return fail(path, 'expected YYYY-MM-DD')
    const parsed = new Date(`${value}T00:00:00Z`)
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
      ? fail(path, 'not a real date')
      : []
  }
}

export function instant() {
  return (path, value) =>
    typeof value === 'string' && ISO_INSTANT.test(value) && !Number.isNaN(Date.parse(value))
      ? []
      : fail(path, 'expected ISO-8601 UTC timestamp')
}

/** An https URL, optionally constrained to a prefix. */
export function url({ prefix } = {}) {
  return (path, value) => {
    if (typeof value !== 'string') return fail(path, `expected URL string, got ${typeName(value)}`)
    try {
      const parsed = new URL(value)
      if (parsed.protocol !== 'https:') return fail(path, 'must be https')
      if (parsed.username || parsed.password) return fail(path, 'must not carry credentials')
    } catch {
      return fail(path, 'not a valid URL')
    }
    if (/[\s<>"'`()]/.test(value)) return fail(path, 'contains characters unsafe in markdown/HTML')
    if (prefix && !value.startsWith(prefix)) return fail(path, `must start with ${prefix}`)
    return []
  }
}

export function nullable(check) {
  return (path, value) => (value === null ? [] : check(path, value))
}

export function list(check, { min = 0, max = 1000 } = {}) {
  return (path, value) => {
    if (!Array.isArray(value)) return fail(path, `expected array, got ${typeName(value)}`)
    if (value.length < min || value.length > max) return fail(path, `length ${value.length} outside [${min}, ${max}]`)
    return value.flatMap((item, i) => check(`${path}[${i}]`, item))
  }
}

export function all(...checks) {
  return (path, value) => checks.flatMap((check) => check(path, value))
}
