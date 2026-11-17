import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// Blog posts: Markdown in src/content/blog. A post with `draft: true` shows in `astro dev` only.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    // At most 49 characters: the layout adds " | Colophon", and the whole title stays within 60.
    title: z.string().max(49),
    // 120 to 155 characters: long enough to say what the post teaches, short enough not to be cut in results.
    description: z.string().min(120).max(155),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // A glossary post: its <h3 id> terms also become DefinedTermSet structured data.
    glossary: z.boolean().default(false),
    // One sentence on what is still missing for this post's topic, shown after the shared status line.
    status: z.string().optional(),
  }),
})

export const collections = { blog }
