// Loads profile.json from a local file (--data) or over HTTPS (PROFILE_URL).
import { readFile } from 'node:fs/promises'

const MAX_BYTES = 2 * 1024 * 1024
const TIMEOUT_MS = 20_000

function parse(text, source) {
  if (text.length > MAX_BYTES) throw new Error(`${source}: larger than ${MAX_BYTES} bytes`)
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${source}: invalid JSON (${error.message})`)
  }
}

async function fetchJson(url) {
  if (!url.startsWith('https://')) throw new Error(`PROFILE_URL must be https: ${url}`)
  let response
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Ricko12vPL-profile-generator' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    throw new Error(`${url}: request failed (${error.message})`)
  }
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) throw new Error(`${url}: expected JSON, got content-type "${type}"`)
  return parse(await response.text(), url)
}

/** Returns { data, source }. Throws on any problem. */
export async function loadProfile({ dataFile, url }) {
  if (dataFile) {
    const text = await readFile(dataFile, 'utf8').catch((error) => {
      throw new Error(`${dataFile}: cannot read (${error.code ?? error.message})`)
    })
    return { data: parse(text, dataFile), source: dataFile }
  }
  return { data: await fetchJson(url), source: url }
}
