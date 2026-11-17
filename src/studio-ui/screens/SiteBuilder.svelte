<!--
  The site builder: a page entry's Look tab, with the saving and publishing panel beside it.
  Markup copied from Colophon (MIT): apps/studio/src/lib/EntryEditor.svelte (tabs, panel),
  apps/studio/src/lib/SiteCanvas.svelte (the canvas) and apps/studio/src/lib/PublishEntry.svelte.
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/lib/EntryEditor.svelte

  The canvas is the starter's own home page (packages/site-template) with one feature list added,
  rendered by the copied site renderer with the starter theme. `xl:` variants are resolved to
  their desktop values; the sample project is made up.
-->
<script lang="ts">
  import CloudCheckIcon from '@lucide/svelte/icons/cloud-check'
  import Badges from '../shell/Badges.svelte'
  import PageHeader from '../shell/PageHeader.svelte'
  import Shell from '../shell/Shell.svelte'
  import Button from '../ui/Button.svelte'
  import { canvas, STARTER_THEME } from '../site-renderer.ts'

  const page = canvas(
    STARTER_THEME,
    [
      { label: 'Home', href: '/' },
      { label: 'Articles', href: '/articles' },
      { label: 'About', href: '/about' },
    ],
    [
      {
        _block: 'hero',
        heading: 'Your site, your way',
        tagline: 'Sections you arrange, words you change, a design system that is yours.',
        label: 'Start writing',
        url: 'https://example.com/',
      },
      {
        _block: 'features',
        heading: 'What you will find here',
        items: [
          { title: 'Field notes', text: 'Short pieces from the print shop, every week.' },
          { title: 'Long reads', text: 'Essays on paper, ink and pressure.' },
          { title: 'The archive', text: 'Every release of this site, kept.' },
        ],
      },
      {
        _block: 'cta',
        heading: 'Ready when you are',
        text: 'Change these words, or take the section out: every part of this page is content.',
        label: 'Read more',
        url: 'https://example.com/',
        style: { scheme: 'primary', align: 'center' },
      },
    ],
  )

  const tabs = [
    ['content', 'Content'],
    ['visual', 'Look'],
    ['comments', 'Comments'],
    ['history', 'History'],
  ] as const
</script>

<Shell active="pages" crumbs={['Pages', 'Home']}>
  <PageHeader title="Home">
    {#snippet eyebrow()}Pages{/snippet}
  </PageHeader>

  <div class="grid grid-cols-[minmax(0,1fr)_17rem] gap-8">
    <div class="min-w-0">
      <div class="mb-6 inline-flex rounded-lg bg-muted p-1">
        {#each tabs as [value, name] (value)}
          <span
            class="rounded-md px-3 py-1.5 text-sm font-medium {value === 'visual' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
            >{name}{#if value === 'history'}<span class="ml-1.5 text-xs text-muted-foreground tabular">6</span>{/if}</span
          >
        {/each}
      </div>
      <p class="mb-3 text-sm text-muted-foreground">This page as you're editing it — click a section to change it. Readers see it once it's published.</p>
      <div class="h-[36rem] w-full overflow-hidden rounded-xl border border-border bg-white">
        <div>{@html page}</div>
      </div>
    </div>

    <div class="min-w-0 self-start rounded-xl border border-border bg-card p-4 shadow-xs">
      <div class="space-y-2.5">
        <p class="text-sm leading-6">
          <span class="mr-1.5 inline-flex align-[0.0625rem]"><Badges pill={{ kind: 'entry', state: 'changed' }} /></span>
          <span>Readers see the version in <span class="underline underline-offset-2">Release 145</span>, not your newer changes.</span>
        </p>
        <p class="flex min-w-0 items-start gap-2 text-sm font-medium">
          <CloudCheckIcon class="mt-0.5 size-4 shrink-0 text-live" />
          <span>Saved<span class="ml-1 font-normal text-muted-foreground">just now</span></span>
        </p>
      </div>
      <div class="mt-4 space-y-2 border-t border-dotted border-border pt-4">
        <div class="grid shrink-0 gap-2">
          <Button class="flex-1">Ask for review</Button>
          <Button class="flex-1" variant="outline">Ask to unpublish</Button>
        </div>
        <p class="text-xs text-muted-foreground">Someone who can publish approves it and puts it live.</p>
      </div>
      <div class="mt-4 border-t border-dotted border-border pt-3 text-xs text-muted-foreground">
        <p>Created 9/14/2026</p>
      </div>
    </div>
  </div>
</Shell>
