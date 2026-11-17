<!--
  Copied from Colophon (MIT): packages/ui/src/lib/components/ui/badge/badge.svelte
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/packages/ui/src/lib/components/ui/badge/badge.svelte

  Adapted for build-time rendering: tailwind-variants' tv() is a plain lookup here (the class
  strings are Colophon's, unchanged), and the element is always a span (no links in an
  illustration).
-->
<script lang="ts" module>
  // Pills. The four states (live, pending, attention, draft) always pair their colour with a
  // word, and usually a dot or an icon: colour is never the only signal.
  const base =
    'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:ring-4 focus-visible:ring-ring/25 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3'

  export const badgeVariants = {
    default: 'border-transparent bg-primary text-primary-foreground [a]:hover:bg-primary/88',
    secondary: 'border-transparent bg-secondary text-secondary-foreground [a]:hover:bg-accent',
    destructive: 'border-transparent bg-attention-soft text-attention-ink',
    outline: 'border-border bg-card text-foreground [a]:hover:bg-accent',
    ghost: 'border-transparent text-muted-foreground [a]:hover:text-foreground',
    link: 'border-transparent text-foreground underline-offset-4 hover:underline',
    live: 'border-transparent bg-live-soft text-live-ink',
    pending: 'border-transparent bg-pending-soft text-pending-ink',
    attention: 'border-transparent bg-attention-soft text-attention-ink',
    draft: 'border-transparent bg-draft-soft text-draft-ink',
    brand: 'border-transparent bg-brand-soft text-brand-ink',
  } as const

  export type BadgeVariant = keyof typeof badgeVariants
  export const badgeClass = (variant: BadgeVariant = 'default') => `${base} ${badgeVariants[variant]}`
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../utils.ts'

  let {
    class: className,
    variant = 'default',
    children,
  }: { class?: string; variant?: BadgeVariant; children?: Snippet } = $props()
</script>

<span data-slot="badge" class={cn(badgeClass(variant), className)}>{@render children?.()}</span>
