import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MEDIA, OPEN_SOURCE } from '../config.mjs'
import { ALLOWED_REPOS, validateProfile } from '../lib/validate.mjs'
import { openSourceRepos, openSourceSection, paperWording } from '../lib/cards/entries.mjs'
import { GLYPHS } from '../lib/cards/fig1.mjs'
import { allImages, buildDocument, renderJobs } from '../lib/document.mjs'
import { staleFiles } from '../lib/output.mjs'
import { buildReadme, textIndex } from '../lib/readme.mjs'
import { fill } from '../lib/template.mjs'
import { fixture, withEdit } from './helpers.mjs'

const data = fixture()
const groups = buildDocument(data, 12345)
const jobs = renderJobs(groups)
const sizes = new Map(jobs.map((job) => [job.file, { width: 248, height: 100 }]))
const readme = buildReadme(groups, sizes, data)

describe('document', () => {
  it('has one card per featured project plus the index card, and one per paper', () => {
    const ids = allImages(groups).map((image) => image.id)
    data.projects.forEach((p) => assert.ok(ids.includes(`project-${p.slug}`)))
    data.papers.forEach((p) => assert.ok(ids.includes(`paper-${p.slug}`)))
    assert.ok(ids.includes('project-index'))
    assert.equal(new Set(ids).size, ids.length)
  })

  it('names every asset uniquely, in dark and light', () => {
    const files = jobs.map((job) => job.file)
    assert.equal(new Set(files).size, files.length)
    assert.ok(files.includes('project-x-quant-connected-dark.png'))
    assert.ok(files.includes('header-wide-light.png'))
    assert.equal(files.filter((f) => f.endsWith('-dark.png')).length, files.length / 2)
  })

  it('draws the same glyph matrix for the same seed', () => {
    const fig = (seed) => allImages(buildDocument(data, seed)).find((i) => i.id === 'fig1').wide.html
    assert.equal(fig(1), fig(1))
    assert.notEqual(fig(1), fig(2))
    assert.ok(GLYPHS.every((g) => /^[0-9A-Z]$/.test(g)))
  })
})

describe('layout tiers', () => {
  const images = allImages(groups)

  it('renders every narrow variant at the one 384 px width', () => {
    images.forEach((image) => assert.match(image.plain, /id="shot" class="(frame|block) narrow" style="width:384px/, image.id))
  })

  it('switches every image to its wide variant at the same breakpoint', () => {
    assert.equal(MEDIA.wide, MEDIA.connected)
    images.forEach((image) => assert.equal(image.wide?.media, MEDIA.connected, image.id))
  })

  it('numbers the intro rules and sections like the site (01 whoami, 02 activity, then 03…)', () => {
    const order = images.map((image) => image.id).filter((id) => /^(rule|section)-/.test(id))
    assert.deepEqual(order, ['rule-whoami', 'rule-activity', 'section-research', 'section-projects', 'section-open-source', 'section-log'])
    assert.deepEqual(
      images.filter((image) => /^(rule|section)-/.test(image.id)).map((image) => image.alt.slice(0, 2)),
      ['01', '02', '03', '04', '05', '06']
    )
  })

  it('closes the projects tree on the index card and the log on the contact row', () => {
    const projects = groups.find((g) => g.kind === 'section' && g.header.id === 'section-projects')
    assert.deepEqual(projects.rows.at(-1).map((image) => image.id), ['project-index'])
    assert.match(projects.rows.at(-1)[0].wide.html, /M372 10V24/)
    const log = groups.find((g) => g.kind === 'section' && g.header.id === 'section-log')
    assert.deepEqual(log.rows.at(-1).map((image) => image.id), ['link-site', 'link-linkedin', 'link-email'])
    log.rows.at(-1).forEach((image) => assert.match(image.wide.html, /width:248px/))
  })
})

describe('alt text', () => {
  const alt = (id) => allImages(groups).find((image) => image.id === id).alt

  it('labels the project date as a start date', () => {
    assert.match(alt('project-x-quant'), /^X_Quant — archived; started 2024-06-15\. /)
    assert.match(alt('project-x-quant'), /No strategy it tested was validated for trading\. Opens/)
  })

  it('ends every card text as a sentence before "Opens …"', () => {
    allImages(groups).forEach((image) => assert.doesNotMatch(image.alt, /[a-z0-9] Opens the/i, image.id))
    assert.match(alt('oss-neo-triage-hack'), /Opus 4\.7 review\. Opens the GitHub repository\.$/)
  })

  it('does not repeat the paper status the venue already states', () => {
    assert.match(alt('paper-validation-crisis'), / — self-archived preprint, 2026-06-02\. Opens/)
    assert.match(alt('paper-executable-gate-research-org'), / — preprint, Zenodo \(v0\.2\.0\)/)
  })

  it('keeps the terminal alt to what the terminal shows', () => {
    assert.doesNotMatch(alt('terminal'), /contributions/)
    assert.match(alt('terminal'), /Now: in progress — /)
  })
})

describe('paper wording', () => {
  const base = { title: 'T', date: '2026-01-01', status: 'preprint', url: 'https://kacpersaks.dev/research/t' }

  it('says "no DOI" and drops a venue line that only repeats the status', () => {
    const words = paperWording({ ...base, venue: 'Self-archived preprint', doi: null })
    assert.equal(words.footer, 'no DOI · self-archived')
    assert.equal(words.venueLine, null)
  })

  it('keeps the venue and shows the DOI when there is one', () => {
    const words = paperWording({ ...base, venue: 'Zenodo (v0.2.0)', doi: 'https://doi.org/10.5281/zenodo.1' })
    assert.equal(words.footer, 'doi:10.5281/zenodo.1')
    assert.equal(words.venueLine, 'Zenodo (v0.2.0)')
  })

  it('keeps an informative venue when there is no DOI', () => {
    const words = paperWording({ ...base, venue: 'Workshop on X', doi: null })
    assert.equal(words.footer, 'no DOI')
    assert.equal(words.venueLine, 'Workshop on X')
  })
})

describe('README', () => {
  it('wraps every image in a picture with dark/light sources and alt text', () => {
    const pictures = readme.match(/<picture>/g) ?? []
    assert.equal(pictures.length, allImages(groups).length)
    assert.equal((readme.match(/<img /g) ?? []).length, pictures.length)
    assert.ok(!/alt=""/.test(readme))
    assert.ok(readme.includes(`media="${MEDIA.connected} and (prefers-color-scheme: dark)"`))
    assert.ok(readme.includes(`media="${MEDIA.wide} and (prefers-color-scheme: light)"`))
  })

  it('sets width but never height, so scaled images keep their aspect ratio', () => {
    assert.ok(!/<(img|source)[^>]*\sheight=/.test(readme))
    assert.ok(/<img [^>]*width="\d+"/.test(readme))
  })

  it('keeps cards in a row free of whitespace so connectors meet', () => {
    assert.ok(readme.includes('</a><a href='))
    assert.ok(!/<\/a>\s+<a href=/.test(readme))
  })

  it('writes the groups in document order', () => {
    const at = (file) => readme.indexOf(file)
    const order = ['header-light', 'statusbar-light', 'rule-whoami-light', 'terminal-light', 'rule-activity-light', 'fig1-light', 'section-research-light', 'project-index-light', 'section-log-light', 'link-email-light']
    order.reduce((previous, file) => {
      assert.ok(at(file) > previous, file)
      return at(file)
    }, -1)
  })

  it('links repos only where the data has one, and only audited ones', () => {
    assert.ok(readme.includes('href="https://github.com/Ricko12vPL/worldclass-research-org"'))
    assert.ok(readme.includes('href="https://kacpersaks.dev/projects/alpha-lab"'))
    const linked = [...readme.matchAll(/https:\/\/github\.com\/Ricko12vPL\/([A-Za-z0-9._-]+)/g)].map((m) => m[1].toLowerCase())
    assert.ok(linked.length > 0)
    linked.forEach((name) => assert.ok(ALLOWED_REPOS.includes(name), name))
  })

  it('lists the same links as plain text', () => {
    const index = textIndex(data)
    assert.match(index, /^- \*\*Research:\*\*/m)
    assert.match(index, /\[X\\_Quant\]\(https:\/\/kacpersaks\.dev\/projects\/x-quant /)
    assert.match(index, /mailto:kacpersaks@proton\.me/)
  })

  it('adds the audited open-source repos as linked cards and plain links', () => {
    for (const repo of OPEN_SOURCE) {
      assert.ok(readme.includes(`href="${repo.repo}"`), repo.name)
      assert.ok(textIndex(data).includes(`](${repo.repo} `), repo.name)
    }
    assert.match(textIndex(data), /^- \*\*Open source:\*\* \[neo-triage-hack\]/m)
    const ids = allImages(groups).map((image) => image.id)
    assert.ok(ids.includes('section-open-source'))
    assert.deepEqual(
      ids.filter((id) => id.startsWith('oss-')),
      OPEN_SOURCE.map((repo) => `oss-${repo.id}`)
    )
  })

  it('never links a repository that is not on the allowlist', () => {
    const unaudited = withEdit((d) => {
      d.projects[1].repo = 'https://github.com/Ricko12vPL/not-audited-repo'
    })
    assert.ok(validateProfile(unaudited).some((p) => /not on the audited allowlist/.test(p)))
    assert.ok(!readme.includes('github.com/Ricko12vPL/not-audited-repo'))
  })

  it('skips an open-source card already shown as a featured project', () => {
    const featuredMaze = withEdit((d) => {
      d.projects[1].repo = 'https://github.com/Ricko12vPL/Amazing_Maze'
    })
    assert.deepEqual(
      openSourceRepos(featuredMaze).map((repo) => repo.id),
      ['neo-triage-hack', 'claude-code-skills']
    )
    assert.equal(openSourceSection(data, []), null)
  })

  it('uses the card one-liner, not the full title, as project hover text', () => {
    const quantbrief = data.projects.find((p) => p.slug === 'quantbrief')
    assert.ok(!textIndex(data).includes(quantbrief.title))
    assert.ok(textIndex(data).includes(`"${quantbrief.oneLiner}"`))
  })

  it('keeps the availability line verbatim', () => {
    assert.ok(readme.includes('Open to fully remote roles — AI/ML engineering, backend, research engineering, quant.'))
  })
})

describe('template and output helpers', () => {
  it('escapes values and refuses missing ones', () => {
    assert.equal(fill('<b>{{x}}</b>{{{y}}}', { x: '<&>', y: '<i/>' }), '<b>&lt;&amp;&gt;</b><i/>')
    assert.throws(() => fill('{{missing}}', {}), /missing/)
  })

  it('only removes files the generator owns', () => {
    const existing = ['hero.svg', 'header-dark.png', 'project-old-connected-light.png', 'oss-old-dark.png', 'photo.png', 'data-hash.txt']
    assert.deepEqual(staleFiles(existing, new Set(['header-dark.png'])), ['project-old-connected-light.png', 'oss-old-dark.png'])
  })
})
