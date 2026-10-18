import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateProfile } from '../lib/validate.mjs'
import { OPEN_SOURCE } from '../config.mjs'
import { fixture, withEdit } from './helpers.mjs'

const problemsMatching = (data, pattern) => validateProfile(data).filter((p) => pattern.test(p))

describe('validateProfile', () => {
  it('accepts the fixture built from the site content', () => {
    assert.deepEqual(validateProfile(fixture()), [])
  })

  it('rejects non-objects', () => {
    assert.ok(validateProfile(null).length > 0)
    assert.ok(validateProfile([]).length > 0)
    assert.ok(validateProfile('{}').length > 0)
  })

  it('rejects unknown and missing keys', () => {
    assert.equal(problemsMatching(withEdit((d) => { d.extra = 1 }), /\$\.extra: unknown key/).length, 1)
    assert.equal(problemsMatching(withEdit((d) => { delete d.counts }), /\$\.counts: missing/).length, 1)
    assert.equal(
      problemsMatching(withEdit((d) => { d.projects[0].stars = 5 }), /projects\[0\]\.stars: unknown key/).length,
      1
    )
  })

  it('rejects a bad status, a mismatched glyph and a wrong label', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].status = 'live' }), /status/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].glyph = '◐' }), /glyph/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].statusLabel = 'Done' }), /statusLabel/).length > 0)
  })

  it('never lets a repository off the allowlist through', () => {
    const data = withEdit((d) => {
      d.projects[2].repo = 'https://github.com/Ricko12vPL/not-audited-repo'
    })
    assert.equal(problemsMatching(data, /not on the audited allowlist/).length, 1)
  })

  it('rejects repositories of other owners and non-https links', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].repo = 'https://github.com/someone/x' }), /repository of/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].url = 'http://kacpersaks.dev/projects/x' }), /https/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.posts[0].url = 'https://evil.example/blog/x' }), /must start with/).length > 0)
  })

  it('enforces the one-liner limit and real dates', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.projects[0].oneLiner = 'x'.repeat(111) }), /longer than 110/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.papers[0].date = '2026-02-30' }), /not a real date/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.generatedAt = 'yesterday' }), /generatedAt/).length > 0)
  })

  it('fails closed on withdrawn X_Quant claims', () => {
    const data = withEdit((d) => { d.projects[1].oneLiner = 'Sharpe 5.24 on IBKR paper trading.' })
    assert.ok(problemsMatching(data, /honesty envelope/).length >= 1)
  })

  it('checks contribution totals against the days', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.contributions.total += 1 }), /total/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.contributions.activeDays = 1 }), /activeDays/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.contributions.longestStreak.days = 99 }), /longestStreak/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.contributions.busiestDay.count = 1 }), /busiestDay/).length > 0)
  })

  it('requires consecutive days and consistent levels', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.contributions.days.splice(10, 1) }), /consecutive/).length > 0)
    const zeroDay = (d) => d.contributions.days.find((day) => day.count === 0)
    assert.ok(problemsMatching(withEdit((d) => { zeroDay(d).level = 2 }), /level 0/).length > 0)
  })

  it('requires counts to cover the listed items and unique slugs', () => {
    assert.ok(problemsMatching(withEdit((d) => { d.counts.papers = 0 }), /counts\.papers/).length > 0)
    assert.ok(problemsMatching(withEdit((d) => { d.posts[1].slug = d.posts[0].slug; d.posts[1].url = d.posts[0].url }), /duplicate/).length > 0)
  })

  it('accepts a repository that is on the allowlist', () => {
    const data = withEdit((d) => {
      d.projects[1].repo = 'https://github.com/Ricko12vPL/Amazing_Maze'
    })
    assert.deepEqual(problemsMatching(data, /allowlist/), [])
  })
})

describe('open-source allowlist', () => {
  const repo = (overrides) => ({ ...OPEN_SOURCE[0], ...overrides })
  const check = (openSource) => validateProfile(fixture(), { openSource })

  it('accepts the configured allowlist', () => {
    assert.deepEqual(check(OPEN_SOURCE), [])
  })

  it('rejects repositories off the allowlist and foreign ones', () => {
    for (const name of ['not-audited-repo', 'another-unlisted-repo']) {
      const problems = check([repo({ repo: `https://github.com/Ricko12vPL/${name}` })])
      assert.ok(problems.some((p) => /not on the audited allowlist/.test(p)), name)
    }
    assert.ok(check([repo({ repo: 'https://github.com/someone/neo-triage-hack' })]).some((p) => /repository of/.test(p)))
  })

  it('requires a language and a start month for each repo', () => {
    assert.ok(check([repo({ started: '2026-13' })]).some((p) => /started/.test(p)))
    assert.ok(check([repo({ language: '<script>' })]).some((p) => /language/.test(p)))
    const { language, ...noLanguage } = OPEN_SOURCE[0]
    assert.ok(language)
    assert.ok(check([noLanguage]).some((p) => /language: missing/.test(p)))
  })

  it('rejects unknown keys, long text, duplicates and withdrawn claims', () => {
    assert.ok(check([repo({ stars: 12 })]).some((p) => /stars: unknown key/.test(p)))
    assert.ok(check([repo({ text: 'x'.repeat(111) })]).some((p) => /longer than 110/.test(p)))
    assert.ok(check([repo({}), repo({ id: 'other' })]).some((p) => /duplicate repo/.test(p)))
    assert.ok(check([repo({ text: 'Sharpe 5 on paper' })]).some((p) => /withdrawn claim/.test(p)))
  })
})
