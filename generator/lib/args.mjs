// CLI flags. Unknown flags are an error (fail closed).
import { parseArgs as parseNodeArgs } from 'node:util'

export const USAGE = `usage: node render.mjs [--data <profile.json>] [--force] [--validate-only] [--out <repo-root>]
  (no --data)      fetch PROFILE_URL (default https://kacpersaks.dev/profile.json)
  --force          re-render even if assets/data-hash.txt matches
  --validate-only  check the contract and exit; writes nothing
  CHROMIUM_PATH    optional Chromium executable (otherwise Playwright's own)
`

export function parseArgs(argv) {
  const { values } = parseNodeArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      data: { type: 'string' },
      out: { type: 'string' },
      force: { type: 'boolean', default: false },
      'validate-only': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  })
  return {
    data: values.data ?? null,
    out: values.out ?? null,
    force: values.force,
    validateOnly: values['validate-only'],
    help: values.help,
  }
}
