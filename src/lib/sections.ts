import type { PageData } from './schemas'

type Kind = PageData['kind']

/** Where a page of each kind is served. */
export const SECTION = { compare: 'compare', 'use-case': 'use-cases', feature: 'features', guide: 'guides' } as const satisfies Record<Exclude<Kind, 'hub'>, string>

/** The address of a page: /compare/colophon-vs-contentful/, or a hub's own section: /compare/. */
export const pagePath = (kind: Kind, id: string) => (kind === 'hub' ? `/${id}/` : `/${SECTION[kind]}/${id}/`)
