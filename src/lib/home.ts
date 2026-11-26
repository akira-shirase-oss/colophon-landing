import { getEntry } from 'astro:content'

/** The home page's words: the published `home` entry of the Colophon project, or src/data/home.ts. */
export async function homeCopy() {
  const entry = await getEntry('home', 'current')
  if (!entry) throw new Error('the home entry is missing')
  return entry.data
}

/** The site-wide status line and the version it speaks of. */
export async function siteCopy() {
  const entry = await getEntry('site', 'current')
  if (!entry) throw new Error('the site entry is missing')
  return entry.data
}

/**
 * What every built page's document needs from the published words: the share image's alt text (it names the
 * home page's headline) and the release this build read. The layouts in src/layouts take these as props, so a
 * draft preview can hand them its own.
 */
export async function published() {
  return {
    imageAlt: `Colophon: ${(await homeCopy()).hero_headline}`,
    generation: (await getEntry('build', 'current'))?.data.generation ?? 0,
  }
}
