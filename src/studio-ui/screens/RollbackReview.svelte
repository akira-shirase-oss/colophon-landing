<!--
  A rollback waiting for review: the publish request a release's "Roll back to this release" opens.
  Markup copied from Colophon (MIT): apps/studio/src/routes/projects/[project]/changesets/[changeset]/+page.svelte,
  with its words from apps/studio/src/lib/words.ts.
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/routes/projects/%5Bproject%5D/changesets/%5Bchangeset%5D/%2Bpage.svelte

  The `lg:` variants answer to the window's width (see shell/Panel.svelte), the entries are shown
  folded, the section headings are paragraphs with their classes (the illustration is not part of
  the landing page's outline), and the sample entries, stages and people are made up.
-->
<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import PageHeader from '../shell/PageHeader.svelte'
  import Panel from '../shell/Panel.svelte'
  import Badge from '../ui/Badge.svelte'
  import Button from '../ui/Button.svelte'

  const STEPS = ['Prepared', 'Sent for review', 'Approved', 'Live'] as const
  const reached = 2

  const items = [
    { title: 'Spring opening hours', type: 'Articles', kind: 'update' },
    { title: 'Price list', type: 'Pages', kind: 'update' },
    { title: 'Workshop: letterpress basics', type: 'Articles', kind: 'unpublish' },
    { title: 'Home', type: 'Pages', kind: 'update' },
  ] as const

  const stages = [
    { name: 'Editor', state: 'Approved', variant: 'live', by: 'by Alex · 20 minutes ago' },
    { name: 'Legal', state: 'Waiting', variant: 'pending', by: null },
  ] as const
</script>

<Panel>
  <PageHeader title="Rollback to release 144">
    {#snippet meta()}
      <span class="inline-flex flex-wrap items-center gap-2">
        <!-- ChangesetBadge (apps/studio/src/lib/shell/ChangesetBadge.svelte): awaiting_review -->
        <Badge variant="pending">Waiting for review</Badge>
        <span>restores <span class="underline underline-offset-2">release 144</span></span>
      </span>
    {/snippet}
  </PageHeader>

  <ol class="mb-8 grid grid-cols-4 gap-2">
    {#each STEPS as step, index (step)}
      <li class="grid gap-1.5">
        <span class="h-1 rounded-full {index < reached ? 'bg-foreground' : 'bg-border'}"></span>
        <span class="text-xs {index < reached ? 'text-foreground' : 'text-muted-foreground'}">{step}</span>
      </li>
    {/each}
  </ol>

  <div class="grid gap-10 @2xl:grid-cols-[minmax(0,1fr)_20rem]">
    <section>
      <p class="mb-3 text-base font-semibold">Entries <span class="font-normal text-muted-foreground tabular">{items.length}</span></p>
      <ul class="space-y-3">
        {#each items as item (item.title)}
          <li class="overflow-hidden rounded-xl border border-border bg-card">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{item.title}</span>
                <span class="text-xs text-muted-foreground">{item.type}</span>
              </span>
              {#if item.kind === 'unpublish'}
                <Badge variant="attention">unpublish</Badge>
              {:else}
                <Badge variant="pending">update</Badge>
              {/if}
              <Button variant="ghost" size="xs">Changes<ChevronDownIcon /></Button>
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <div class="contents @2xl:block @2xl:space-y-8">
      <section>
        <p class="mb-3 text-base font-semibold">Review stages</p>
        <ol class="space-y-2.5">
          {#each stages as stage, index (stage.name)}
            <li class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span class="text-xs text-muted-foreground tabular">{index + 1}.</span>
              <span class="text-sm font-medium">{stage.name}</span>
              <Badge variant={stage.variant}>{stage.state}</Badge>
              {#if stage.by}<span class="text-xs text-muted-foreground">{stage.by}</span>{/if}
            </li>
          {/each}
        </ol>
      </section>
      <section class="-order-1 rounded-xl border border-border bg-card p-4 shadow-xs @2xl:order-none">
        <p class="text-base font-semibold">Review</p>
        <p class="mt-1 text-sm text-muted-foreground">
          You approve exactly the versions on this page<span class="@2xl:hidden">: the changes are below</span>. If they change, your approval no longer counts.
        </p>
        <div class="mt-4 grid gap-1.5">
          <span class="text-sm font-medium">Deciding</span>
          <span class="flex h-9 w-full items-center rounded-md border border-input bg-card px-3 text-sm shadow-xs">Legal — waiting</span>
        </div>
        <div class="mt-3 grid gap-2">
          <Button>Approve this version</Button>
          <Button variant="outline">Request changes</Button>
        </div>
      </section>
    </div>
  </div>
</Panel>
