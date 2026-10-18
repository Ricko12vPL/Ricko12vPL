// Static copy and layout constants. Everything else comes from profile.json.
export const DEFAULT_PROFILE_URL = 'https://kacpersaks.dev/profile.json'

export const PROMPT_USER = 'kacper@warsaw'
export const QUESTION = 'How do you know your system actually works?'

// The only wording allowed for availability (see the honesty envelope).
// Set SHOW_OPEN_TO to false to drop the line entirely; never edit the text.
export const SHOW_OPEN_TO = true
export const OPEN_TO =
  'Open to fully remote roles — AI/ML engineering, backend, research engineering, quant.'

export const ASSETS_DIR = 'assets'
export const HASH_FILE = 'data-hash.txt'

// README geometry, in CSS px (PNG files are rendered at 2x).
// `narrow` is the one width every image uses below the connected tier: the
// widest profile column below 1200 px is ~765 px, so two 384 px images can
// never share a line and the narrow tier is always one uniform column.
export const LAYOUT = Object.freeze({
  full: 744,
  narrow: 384,
  insetX: 8,
  plainPadY: 6,
  stub: 14,
  jog: 7,
  scale: 2,
})

// When the wide variant of an image replaces its narrow one. Profile README
// column widths measured on github.com (viewport → column, CSS px):
//   360 → 278 · 375 → 293 · 390 → 308 · 768 → 398 · 834 → 464 · 1011 → 641
//   1012 → 578 · 1100 → 666 · 1180 → 746 · 1200 → 766 · >= 1280 → 846
// From 1200 px the column is >= 766 px (>= 749 px even with a 17 px classic
// scrollbar, which media queries count and layout does not), so 744 px rows
// never scale or wrap. Below it, everything is the 384 px narrow layout.
export const MEDIA = Object.freeze({
  connected: '(min-width: 1200px)',
  wide: '(min-width: 1200px)',
})

// Rules above the two intro blocks, numbered like the site's home page
// (01 whoami, 02 activity); the tree sections continue from 03.
export const INTRO_RULES = Object.freeze({
  whoami: { id: 'whoami', index: '01', name: 'whoami', command: 'cat ~/.profile' },
  activity: { id: 'activity', index: '02', name: 'activity', command: 'plot --calendar' },
})

export const SECTIONS = Object.freeze({
  research: { id: 'research', index: '03', name: 'research', command: 'ls ~/research', path: '/research', columns: 2 },
  projects: {
    id: 'projects',
    index: '04',
    name: 'projects',
    command: 'ls -l ~/projects --featured',
    path: '/projects',
    columns: 3,
  },
  openSource: {
    id: 'open-source',
    index: '05',
    name: 'open source',
    command: 'ls ~/github --public',
    path: '/projects',
    columns: 3,
  },
  log: { id: 'log', index: '06', name: 'log', command: 'tail -n 4 ~/blog', path: '/blog', columns: 1 },
})

// Public repositories cleared for linking that profile.json cannot carry (it
// lists featured projects only). Static on purpose: no stars, dates or other
// live GitHub data. `text` follows the site's one-liner rule for repos with a
// site page and is the audit's measured safe description otherwise.
// `language` is GitHub's primary language (Markdown where GitHub shows none)
// and `started` the creation month, both copied once from the repo page.
export const OPEN_SOURCE = Object.freeze([
  Object.freeze({
    id: 'neo-triage-hack',
    name: 'neo-triage-hack',
    repo: 'https://github.com/Ricko12vPL/neo-triage-hack',
    language: 'TypeScript',
    started: '2026-04',
    text: 'Hackathon prototype (Apr 2026): Bayesian NEO follow-up triage with Claude Opus 4.7 review',
  }),
  Object.freeze({
    id: 'claude-code-skills',
    name: 'claude-code-skills',
    repo: 'https://github.com/Ricko12vPL/claude-code-skills',
    language: 'Markdown',
    started: '2025-10',
    text: 'Open-source collection of comprehensive AI coding assistant skills for Python, ML, and quantitative finance…',
  }),
  Object.freeze({
    id: 'amazing-maze',
    name: 'Amazing_Maze',
    repo: 'https://github.com/Ricko12vPL/Amazing_Maze',
    language: 'HTML',
    started: '2025-10',
    text: "Interactive maze generation and pathfinding visualizer with DFS, Kruskal's, BFS, and A* algorithms, featuring…",
  }),
])

// Fixed card heights keep every image in a row the same height, so the
// connector stubs of neighbouring rows meet. `narrow` is the 384 px layout.
export const CARD_HEIGHT = Object.freeze({
  project: { wide: 181, narrow: 228 },
  paper: { wide: 164, narrow: 248 },
  cta: { wide: 58, narrow: 80 },
  link: { wide: 40, narrow: 48 },
})
