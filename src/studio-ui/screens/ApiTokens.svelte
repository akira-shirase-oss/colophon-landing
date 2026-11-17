<!--
  Settings → API tokens: scoped tokens for scripts, site builds and agents.
  Markup copied from Colophon (MIT): apps/studio/src/routes/projects/[project]/settings/tokens/+page.svelte
  inside apps/studio/src/lib/SettingsFrame.svelte, with the token wording of its what()/when()
  and of apps/studio/src/lib/permissions.ts.
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/routes/projects/%5Bproject%5D/settings/tokens/%2Bpage.svelte

  The `lg:` frame is resolved to its desktop columns, its group labels are paragraphs with their
  classes (the illustration is not part of the landing page's outline), and the sample tokens
  and people are made up.
-->
<script lang="ts">
  import type { Component } from 'svelte'
  import GlobeIcon from '@lucide/svelte/icons/globe'
  import HistoryIcon from '@lucide/svelte/icons/history'
  import KeyRoundIcon from '@lucide/svelte/icons/key-round'
  import ListChecksIcon from '@lucide/svelte/icons/list-checks'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'
  import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal'
  import PageHeader from '../shell/PageHeader.svelte'
  import Shell from '../shell/Shell.svelte'
  import Badge from '../ui/Badge.svelte'
  import Button from '../ui/Button.svelte'

  const groups: { label: string; items: { label: string; icon: Component; active?: boolean }[] }[] = [
    {
      label: 'Project',
      items: [
        { label: 'General', icon: SlidersHorizontalIcon },
        { label: 'Roles', icon: ShieldCheckIcon },
        { label: 'Review stages', icon: ListChecksIcon },
        { label: 'Website connections', icon: GlobeIcon },
      ],
    },
    {
      label: 'Access',
      items: [
        { label: 'API tokens', icon: KeyRoundIcon, active: true },
        { label: 'Activity', icon: HistoryIcon },
      ],
    },
  ]

  const tokens = [
    {
      name: 'Site build',
      active: true,
      description: 'Reads the published site at each release.',
      what: 'Read only',
      when: 'Last used 4 minutes ago · Works until Feb 12, 2027 · Made by Alex, 3 weeks ago',
    },
    {
      name: 'Writing assistant (MCP)',
      active: true,
      description: 'Drafts changes and sends them for review.',
      what: 'Custom: see everything, create Articles, edit Articles',
      when: 'Last used yesterday · Works until Dec 17, 2026 · Made by Alex, 2 weeks ago',
    },
    {
      name: 'Import script',
      active: true,
      description: 'Moves posts over from the old blog.',
      what: 'Custom: create Articles, edit Articles',
      when: 'Never used · Works until Nov 24, 2026 · Made by Sam, 2 days ago',
    },
    {
      name: 'Old build hook',
      active: false,
      description: null,
      what: 'Read only',
      when: 'Last used Sep 30, 2026 · Ended Oct 1, 2026 · Made by Sam, 4 months ago',
    },
  ]
</script>

<Shell active="settings" crumbs={['Settings', 'API tokens']}>
  <div class="grid grid-cols-[13rem_minmax(0,1fr)] gap-8">
    <div class="min-w-0">
      <div class="grid gap-5">
        {#each groups as group (group.label)}
          <div>
            <p class="eyebrow mb-1.5 px-2.5">{group.label}</p>
            <ul class="grid gap-0.5">
              {#each group.items as item (item.label)}
                <li>
                  <span
                    class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm {item.active ? 'bg-card font-medium shadow-hairline' : 'text-muted-foreground'}"
                    ><item.icon class="size-4 shrink-0" /><span class="truncate">{item.label}</span></span
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>

    <div class="min-w-0">
      <PageHeader title="API tokens">
        {#snippet description()}
          A token lets a script, your site's build or another tool use this project's content without anyone's password. Each has its own powers and an end date, and
          can be revoked at any time.
        {/snippet}
        {#snippet actions()}
          <Button><PlusIcon data-icon="inline-start" />New token</Button>
        {/snippet}
      </PageHeader>

      <section class="max-w-3xl">
        <ul class="overflow-hidden rounded-xl border border-border bg-card">
          {#each tokens as token (token.name)}
            <li class="rule-dotted flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 last:border-b-0">
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="font-medium">{token.name}</strong>
                  <Badge variant={token.active ? 'live' : 'draft'}>{token.active ? 'Active' : 'Ended'}</Badge>
                </span>
                {#if token.description}<span class="block text-sm text-muted-foreground">{token.description}</span>{/if}
                <span class="block text-sm">{token.what}</span>
                <span class="block text-xs text-muted-foreground">{token.when}</span>
              </span>
              {#if token.active}
                <Button variant="outline" size="sm">Revoke</Button>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    </div>
  </div>
</Shell>
