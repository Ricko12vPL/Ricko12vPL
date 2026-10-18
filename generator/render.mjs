#!/usr/bin/env node
// Renders the profile README cards from kacpersaks.dev/profile.json.
// Fail closed: any fetch, validation or render error exits 1 before a single
// file is written. Unchanged data (same hash) writes nothing unless --force.
import { join, resolve } from 'node:path'
import { DEFAULT_PROFILE_URL } from './config.mjs'
import { USAGE, parseArgs } from './lib/args.mjs'
import { buildDocument, renderJobs } from './lib/document.mjs'
import { dataHash, generatorFingerprint, renderKey } from './lib/hash.mjs'
import { loadProfile } from './lib/load.mjs'
import { readPreviousKey, writeOutputs } from './lib/output.mjs'
import { seedFromHex } from './lib/prng.mjs'
import { buildReadme } from './lib/readme.mjs'
import { renderJobsToPng } from './lib/screenshot.mjs'
import { GENERATOR_ROOT } from './lib/template.mjs'
import { validateProfile } from './lib/validate.mjs'

const MAX_REPORTED_PROBLEMS = 40
const info = (message) => process.stdout.write(`render: ${message}\n`)

class ContractError extends Error {
  constructor(problems) {
    const shown = problems.slice(0, MAX_REPORTED_PROBLEMS).map((p) => `  - ${p}`)
    const more = problems.length > shown.length ? [`  … and ${problems.length - shown.length} more`] : []
    super(`profile.json failed validation (${problems.length} problem(s)):\n${[...shown, ...more].join('\n')}`)
  }
}

async function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    process.stdout.write(USAGE)
    return 0
  }
  const url = process.env.PROFILE_URL || DEFAULT_PROFILE_URL
  const { data, source } = await loadProfile({ dataFile: args.data, url })
  const problems = validateProfile(data)
  if (problems.length > 0) throw new ContractError(problems)
  if (args.validateOnly) {
    info(`${source}: valid`)
    return 0
  }

  const repoRoot = resolve(args.out ?? join(GENERATOR_ROOT, '..'))
  const key = renderKey(data, generatorFingerprint(GENERATOR_ROOT))
  if (!args.force && readPreviousKey(repoRoot) === key) {
    info(`unchanged (${key.slice(0, 12)}…); nothing written`)
    return 0
  }

  const groups = buildDocument(data, seedFromHex(dataHash(data)))
  const rendered = await renderJobsToPng(renderJobs(groups), { executablePath: process.env.CHROMIUM_PATH })
  const sizes = new Map(rendered.map((r) => [r.file, { width: r.width, height: r.height }]))
  const readme = buildReadme(groups, sizes, data)
  const result = writeOutputs(repoRoot, { rendered, readme, key })
  info(`${source}: wrote ${result.written} files, removed ${result.removed.length} stale`)
  return 0
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`render: ${error.message}\n`)
    process.exit(1)
  })
