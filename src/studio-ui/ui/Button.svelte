<!--
  Copied from Colophon (MIT): packages/ui/src/lib/components/ui/button/button.svelte
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/packages/ui/src/lib/components/ui/button/button.svelte

  Adapted for build-time rendering: tailwind-variants' tv() is a plain lookup here (the class
  strings are Colophon's, unchanged), and there is no link form or click handler. The window
  around an illustration is inert, so these buttons can't be focused or pressed.
-->
<script lang="ts" module>
  const base =
    "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-medium transition-[background-color,box-shadow,color,transform] outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 active:not-aria-[haspopup]:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

  const variants = {
    default: 'bg-primary text-primary-foreground shadow-press hover:bg-primary/88',
    outline: 'border-border bg-card text-foreground shadow-soft hover:bg-accent aria-expanded:bg-accent',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent',
    ghost: 'text-foreground hover:bg-accent aria-expanded:bg-accent',
    destructive: 'bg-destructive text-white shadow-press hover:bg-destructive/90 focus-visible:ring-destructive/25',
    link: 'text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground',
  } as const

  const sizes = {
    default: 'h-10 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
    xs: "h-7 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
    sm: 'h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
    lg: 'h-12 px-7 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
    icon: 'size-10',
    'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
    'icon-sm': 'size-9',
    'icon-lg': 'size-12',
  } as const

  export type ButtonVariant = keyof typeof variants
  export type ButtonSize = keyof typeof sizes
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '../utils.ts'

  let {
    class: className,
    variant = 'default',
    size = 'default',
    disabled = false,
    children,
  }: { class?: string; variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean; children?: Snippet } = $props()
</script>

<button data-slot="button" type="button" class={cn(base, variants[variant], sizes[size], className)} {disabled}>
  {@render children?.()}
</button>
