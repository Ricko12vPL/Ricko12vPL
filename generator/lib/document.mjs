// The README in order, as a list of groups of images. Pure: data in, specs out.
import { INTRO_RULES } from '../config.mjs'
import { loginOf } from './cards/common.mjs'
import { fig1Image } from './cards/fig1.mjs'
import { headerImage, ruleImage, statusbarImage, terminalImage } from './cards/intro.mjs'
import { contactRow } from './cards/links.mjs'
import { logSection, openSourceSection, projectsSection, researchSection } from './cards/entries.mjs'

const blockGroup = (image, header = null) => ({ kind: 'block', header, image })

/**
 * Groups, in README order: { kind: 'block', header, image } |
 * { kind: 'section', header, rows } | { kind: 'links', images }.
 * An image is { id, alt, href, plain, wide } where `plain` is the HTML of the
 * narrow layout and `wide` is null or { html, suffix, media }: the layout
 * shown when `media` matches (connected tree card, or 744 px block).
 * The contact chips close the log section; without posts they stand alone.
 */
export function buildDocument(data, seed) {
  const login = loginOf(data.person.links.github)
  const log = logSection(data)
  return [
    blockGroup(headerImage(data)),
    blockGroup(statusbarImage(data)),
    blockGroup(terminalImage(data), ruleImage(INTRO_RULES.whoami, INTRO_RULES.whoami.command, data.site)),
    blockGroup(fig1Image(data, seed), ruleImage(INTRO_RULES.activity, `${INTRO_RULES.activity.command} ${login}`, data.site)),
    researchSection(data),
    projectsSection(data),
    openSourceSection(data),
    log ?? { kind: 'links', images: contactRow(data) },
  ].filter(Boolean)
}

/** Every image in document order (headers before what they label). */
export function allImages(groups) {
  return groups.flatMap((group) => {
    if (group.kind === 'block') return group.header ? [group.header, group.image] : [group.image]
    if (group.kind === 'section') return [group.header, ...group.rows.flat()]
    return group.images
  })
}

export function assetName(id, suffix, theme) {
  return `${id}${suffix ? `-${suffix}` : ''}-${theme}.png`
}

function variantsOf(image) {
  const plain = [{ suffix: null, html: image.plain }]
  return image.wide ? [...plain, { suffix: image.wide.suffix, html: image.wide.html }] : plain
}

/** Render jobs: one per image × variant × theme, named like the asset files. */
export function renderJobs(groups) {
  return allImages(groups).flatMap((image) =>
    variantsOf(image).flatMap(({ suffix, html }) =>
      ['dark', 'light'].map((theme) => ({ file: assetName(image.id, suffix, theme), theme, body: html }))
    )
  )
}
