<!--
  The media library. Markup copied from Colophon (MIT): apps/studio/src/routes/projects/[project]/media/+page.svelte
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/routes/projects/%5Bproject%5D/media/%2Bpage.svelte

  The grid's `sm:`/`lg:`/`xl:` columns answer to the window's width (see shell/Panel.svelte). The
  uploads are this landing page's own paintings, with their real sizes; the state words are the
  Studio's own ("Usable" once an upload passed its checks, "Checking…" while it is being checked).
-->
<script lang="ts">
  import ImageIcon from '@lucide/svelte/icons/image'
  import TrashIcon from '@lucide/svelte/icons/trash'
  import UploadIcon from '@lucide/svelte/icons/upload'
  import PageHeader from '../shell/PageHeader.svelte'
  import Panel from '../shell/Panel.svelte'
  import Badge from '../ui/Badge.svelte'
  import Button from '../ui/Button.svelte'

  type Asset = { name: string; src?: string; width?: number; height?: number; bytes: number }
  const assets: Asset[] = [
    { name: 'lavender-farmhouse.webp', src: '/images/hero.webp', width: 2326, height: 1200, bytes: 529002 },
    { name: 'lavender-path.webp', src: '/images/cta.webp', width: 2400, height: 912, bytes: 356442 },
    { name: 'dusk-meadow.webp', src: '/images/review-bg.webp', width: 970, height: 958, bytes: 114990 },
    { name: 'evening-clouds.webp', src: '/images/pricing-pro.webp', width: 746, height: 1120, bytes: 91134 },
    { name: 'studio-sketch.png', bytes: 2516582 },
  ]

  function size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
</script>

<Panel>
  <PageHeader title="Media">
    {#snippet description()}
      Every upload in this project: what it settled in, how big it is, and where it came from. Uploads are checked before they can be used; a rejected file never reaches
      a page.
    {/snippet}
    {#snippet actions()}
      <Button><UploadIcon data-icon="inline-start" />Upload</Button>
    {/snippet}
  </PageHeader>

  <ul class="grid gap-3 @xl:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
    {#each assets as asset (asset.name)}
      <li class="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div class="flex h-40 items-center justify-center overflow-hidden border-b border-border bg-secondary/40">
          {#if asset.src}
            <img src={asset.src} alt="" width="320" height="160" class="h-full w-full object-cover" loading="lazy" decoding="async" />
          {:else}
            <ImageIcon class="size-8 text-muted-foreground" />
          {/if}
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <div class="flex items-start justify-between gap-2">
            <span class="min-w-0 truncate font-medium">{asset.name}</span>
            <Badge variant="secondary" class="shrink-0">{asset.src ? 'Usable' : 'Checking…'}</Badge>
          </div>
          <p class="text-sm text-muted-foreground">
            {#if asset.width && asset.height}{asset.width}×{asset.height} · {size(asset.bytes)}{:else}{size(asset.bytes)}{/if}
          </p>
          <div class="mt-auto flex justify-end">
            <Button variant="ghost" size="sm" disabled={!asset.src}><TrashIcon data-icon="inline-start" />Delete</Button>
          </div>
        </div>
      </li>
    {/each}
  </ul>
</Panel>
