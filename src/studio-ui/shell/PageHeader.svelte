<!--
  Copied from Colophon (MIT): apps/studio/src/lib/shell/PageHeader.svelte
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/lib/shell/PageHeader.svelte

  Adapted: the `sm:` variants are resolved to their desktop values, because the illustration is
  always a desktop window, whatever the size of the screen showing it, and the title is a
  paragraph with the heading's classes: the illustration is not part of the landing page's
  outline.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    eyebrow,
    description,
    actions,
    meta,
  }: { title: string; eyebrow?: Snippet; description?: Snippet; actions?: Snippet; meta?: Snippet } = $props()
</script>

<header class="mb-8 flex flex-row items-end justify-between gap-4">
  <div class="min-w-0 space-y-2">
    {#if eyebrow}<div class="text-sm text-muted-foreground">{@render eyebrow()}</div>{/if}
    <p class="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">{title}</p>
    {#if meta}<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">{@render meta()}</div>{/if}
    {#if description}<div class="max-w-2xl text-sm text-pretty text-muted-foreground">{@render description()}</div>{/if}
  </div>
  {#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</header>
