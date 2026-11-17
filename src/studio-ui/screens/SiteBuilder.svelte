<!--
  The site builder: a page entry's Look tab, the page as it is being edited.
  Markup copied from Colophon (MIT): apps/studio/src/lib/EntryEditor.svelte (the tabs) and
  apps/studio/src/lib/SiteCanvas.svelte (the canvas).
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/lib/SiteCanvas.svelte

  The canvas is the starter's own home page (packages/site-template) with one feature list added,
  rendered by the copied site renderer with the starter theme. The illustration crops to the
  editor's main column, so the saving and publishing panel beside it is left out.
-->
<script lang="ts">
  import PageHeader from '../shell/PageHeader.svelte'
  import Panel from '../shell/Panel.svelte'
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

<Panel>
  <PageHeader title="Home">
    {#snippet eyebrow()}Pages{/snippet}
  </PageHeader>
  <div class="mb-6 inline-flex rounded-lg bg-muted p-1">
    {#each tabs as [value, name] (value)}
      <span class="rounded-md px-3 py-1.5 text-sm font-medium {value === 'visual' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
        >{name}{#if value === 'history'}<span class="ml-1.5 text-xs text-muted-foreground tabular">6</span>{/if}</span
      >
    {/each}
  </div>
  <p class="mb-3 text-sm text-muted-foreground">This page as you're editing it — click a section to change it. Readers see it once it's published.</p>
  <div class="h-[36rem] w-full overflow-clip rounded-xl border border-border bg-white">
    <div>{@html page}</div>
  </div>
</Panel>
