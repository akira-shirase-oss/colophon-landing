// What draft preview means on this site: which entries have a preview page, where the drafts are read from,
// and who may frame the result.
import { source } from '../colophon.ts'
import { originOf } from './sdk.ts'

/** The collections of the site's Colophon project (cms/content-types.json): each has a preview page. */
export const COLLECTIONS = ['posts', 'pages', 'home', 'site'] as const
export type Collection = (typeof COLLECTIONS)[number]

export const isCollection = (value: unknown): value is Collection => typeof value === 'string' && (COLLECTIONS as readonly string[]).includes(value)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** An entry's id as Colophon writes it: a lower-case UUID, nothing else. */
export const isEntryId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

/** The preview page of an entry. */
export const previewPath = (collection: Collection, id: string) => `/preview/${collection}/${id}`

/**
 * Whether a resolved path (as `safePreviewPath` hands it over) is one of this site's preview pages:
 * `/preview/<collection>/<entry id>`, with or without the trailing slash, and no query or fragment. The handler
 * redirects nowhere else.
 */
export function isPreviewPath(path: string): boolean {
  const match = /^\/preview\/([a-z]+)\/([0-9a-f-]+)\/?$/.exec(path)
  return match !== null && isCollection(match[1]) && isEntryId(match[2])
}

/**
 * Whether "Exit preview" may go to a resolved path: any page of this site except the preview routes
 * themselves, which would only say the preview has ended.
 */
export const isPublicPath = (path: string) => !/^\/(?:preview|api)(?:[/?#]|$)/.test(path)

/** Where the drafts are read from, and the one origin that may frame a preview. */
export interface PreviewSource {
  /** Colophon's origin: `/preview/v1` is read from it, and the Studio is served from it. */
  api: string
  project: string
  environment: string
  /** The Studio's exact origin: the only frame ancestor, and the only origin the page's script listens to. */
  studioOrigin: string
}

/**
 * The project this site previews: the one its build reads (src/lib/colophon.ts), or `null` when the build reads
 * no project (`COLOPHON_PROJECT=`), where there is nothing to preview. A deployment's own variables of the same
 * names (`COLOPHON_API`, `COLOPHON_PROJECT`, `COLOPHON_ENVIRONMENT`) point the preview somewhere else; all three
 * are public values, and no secret is involved: the one-time code is the credential.
 */
export function previewSource(overrides: Partial<Record<'api' | 'project' | 'environment', string | undefined>> = {}): PreviewSource | null {
  const api = (overrides.api ?? source.api).replace(/\/+$/, '')
  const project = overrides.project ?? source.project
  const environment = overrides.environment ?? source.environment
  if (!isEntryId(project) || !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(environment)) return null
  try {
    return { api, project, environment, studioOrigin: originOf(new URL(api).origin) }
  } catch {
    return null
  }
}
