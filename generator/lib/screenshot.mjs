// Renders each job's HTML with headless Chromium and crops to #shot.
// Returns PNG buffers in memory; nothing touches the disk here.
import { chromium } from 'playwright'
import { LAYOUT } from '../config.mjs'
import { FONT_FAMILIES, fontFaceCss } from './fonts.mjs'
import { TEMPLATES, render } from './template.mjs'

async function mapSeries(items, fn) {
  return items.reduce(async (previous, item) => [...(await previous), await fn(item)], Promise.resolve([]))
}

/**
 * Waits for fonts, trims [data-fit] text to whole words, rounds #shot to whole
 * CSS px, and verifies both faces loaded.
 * fitText: while a box overflows its max-height, drop its last word and end
 * on "…" (trailing punctuation removed), so no line ends mid-word.
 */
async function settle(page) {
  return page.evaluate(async (families) => {
    await Promise.all(families.map((family) => document.fonts.load(`12px "${family}"`)))
    await document.fonts.ready
    const missing = families.filter((family) => !document.fonts.check(`12px "${family}"`))
    const overflows = (el) => el.scrollHeight > el.clientHeight + 1
    const fitText = (el) => {
      const words = el.textContent.trim().split(/\s+/)
      let kept = words.length
      while (overflows(el) && kept > 1) {
        kept -= 1
        el.textContent = `${words.slice(0, kept).join(' ').replace(/[\s,;:.—–-]+$/, '')}…`
      }
      return !overflows(el)
    }
    const unfit = [...document.querySelectorAll('[data-fit]')].filter((el) => !fitText(el))
    const shot = document.getElementById('shot')
    if (!shot) return { error: 'no #shot element' }
    const rect = shot.getBoundingClientRect()
    const width = Math.ceil(rect.width)
    const height = Math.ceil(rect.height)
    shot.style.width = `${width}px`
    shot.style.height = `${height}px`
    if (missing.length > 0) return { error: `fonts not loaded: ${missing.join(', ')}` }
    if (unfit.length > 0) return { error: `text does not fit: ${unfit[0].textContent.slice(0, 40)}` }
    return { width, height }
  }, FONT_FAMILIES)
}

async function renderJob(page, job, shared) {
  const html = render('page.html', { theme: job.theme, fontFaces: shared.fontFaces, css: shared.css, body: job.body })
  await page.setContent(html, { waitUntil: 'load' })
  const size = await settle(page)
  if (size.error) throw new Error(`${job.file}: ${size.error}`)
  const png = await page.locator('#shot').screenshot({ omitBackground: true, animations: 'disabled', type: 'png' })
  return { ...job, png, width: size.width, height: size.height }
}

/**
 * jobs: [{ file, theme, body, … }] → same objects plus { png, width, height }.
 * `executablePath` is optional (CHROMIUM_PATH), for machines without the
 * Playwright-managed browser.
 */
export async function renderJobsToPng(jobs, { executablePath } = {}) {
  const shared = { fontFaces: fontFaceCss(), css: TEMPLATES['base.css'] }
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  try {
    const context = await browser.newContext({
      deviceScaleFactor: LAYOUT.scale,
      viewport: { width: 1200, height: 1600 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    return await mapSeries(jobs, (job) => renderJob(page, job, shared))
  } finally {
    await browser.close()
  }
}
