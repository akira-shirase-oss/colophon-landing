<!--
  Copied from Colophon (MIT): the project shell in apps/studio/src/routes/projects/[project]/+layout.svelte,
  with the classes of the sidebar components it uses (packages/ui/src/lib/components/ui/sidebar/,
  breadcrumb/ and button/).
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/routes/projects/%5Bproject%5D/%2Blayout.svelte

  Adapted for a build-time illustration: the sidebar is rendered in the one state the
  illustrations show (inset, expanded, desktop), so the sidebar components' context, tooltips,
  dropdowns and responsive variants are resolved to their classes for that state. Nothing here
  links anywhere or runs any script; the sample project and its numbers are made up.
-->
<script lang="ts">
  import type { Component, Snippet } from 'svelte'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import ImageIcon from '@lucide/svelte/icons/image'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import ListTodoIcon from '@lucide/svelte/icons/list-todo'
  import PackageCheckIcon from '@lucide/svelte/icons/package-check'
  import PanelLeftIcon from '@lucide/svelte/icons/panel-left'
  import RouteIcon from '@lucide/svelte/icons/route'
  import SearchIcon from '@lucide/svelte/icons/search'
  import Settings2Icon from '@lucide/svelte/icons/settings-2'
  import ShapesIcon from '@lucide/svelte/icons/shapes'
  import SunMoonIcon from '@lucide/svelte/icons/sun-moon'
  import UserRoundIcon from '@lucide/svelte/icons/user-round'
  import UsersIcon from '@lucide/svelte/icons/users'
  import Badges from './Badges.svelte'
  import Mark from './Mark.svelte'

  type Place = 'overview' | 'articles' | 'pages' | 'media' | 'tasks' | 'requests' | 'releases' | 'members' | 'types' | 'migrations' | 'settings'

  let {
    active,
    crumbs,
    children,
  }: {
    /** The sidebar item the page belongs to. */
    active: Place
    /** The breadcrumb after the project's name; the last one is the page itself. */
    crumbs: string[]
    children: Snippet
  } = $props()

  type Item = { place: Place; label: string; icon: Component; badge?: { text: string; class?: string } }
  const groups: { label?: string; items: Item[] }[] = [
    { items: [{ place: 'overview', label: 'Overview', icon: LayoutDashboardIcon }] },
    {
      label: 'Content',
      items: [
        { place: 'articles', label: 'Articles', icon: FileTextIcon },
        { place: 'pages', label: 'Pages', icon: FileTextIcon },
      ],
    },
    {
      label: 'Work',
      items: [
        { place: 'media', label: 'Media', icon: ImageIcon },
        { place: 'tasks', label: 'Tasks', icon: ListTodoIcon },
      ],
    },
    {
      label: 'Publishing',
      items: [
        { place: 'requests', label: 'Publish requests', icon: LayersIcon, badge: { text: '1', class: 'bg-pending-soft text-pending-ink' } },
        { place: 'releases', label: 'Releases', icon: PackageCheckIcon, badge: { text: 'No. 145' } },
      ],
    },
    { label: 'People', items: [{ place: 'members', label: 'Members', icon: UsersIcon }] },
    {
      label: 'Structure',
      items: [
        { place: 'types', label: 'Content types', icon: ShapesIcon },
        { place: 'migrations', label: 'Migrations', icon: RouteIcon },
        { place: 'settings', label: 'Settings', icon: Settings2Icon },
      ],
    },
  ]

  const button = 'flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate'
</script>

<div class="flex h-full w-full bg-sidebar text-foreground">
  <div class="flex w-64 shrink-0 flex-col p-2 text-sidebar-foreground">
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex flex-col gap-2 p-2">
        <div class="{button} h-14">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-background text-foreground shadow-xs">
            <Mark size={16} />
          </span>
          <span class="grid min-w-0 flex-1 text-left leading-tight">
            <span class="truncate font-medium">Field Notes</span>
            <span class="truncate text-xs text-muted-foreground">field-notes</span>
          </span>
          <ChevronsUpDownIcon class="ml-auto text-muted-foreground" />
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {#each groups as group, index (index)}
          <div class="relative flex w-full min-w-0 flex-col p-2">
            {#if group.label}
              <div class="flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-semibold text-sidebar-foreground/70">{group.label}</div>
            {/if}
            <ul class="flex w-full min-w-0 flex-col gap-0.5">
              {#each group.items as item (item.place)}
                <li class="relative">
                  <div class="{button} {item.place === active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : ''}">
                    <item.icon /><span>{item.label}</span>
                  </div>
                  {#if item.badge}
                    <span
                      class="absolute top-2 right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums {item.badge.class ??
                        'text-sidebar-foreground'}">{item.badge.text}</span
                    >
                  {/if}
                </li>
              {/each}
              {#if index === 0}
                <li class="relative">
                  <div class={button}>
                    <SearchIcon /><span>Search</span>
                    <kbd class="ml-auto rounded border border-sidebar-border bg-background px-1.5 font-sans text-sm text-muted-foreground">⌘K</kbd>
                  </div>
                </li>
              {/if}
            </ul>
          </div>
        {/each}
      </div>

      <div class="flex flex-col gap-2 p-2">
        <div class="rounded-xl border border-sidebar-border bg-background p-3 shadow-xs">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-xs text-muted-foreground">Live now</span>
            <span class="tabular text-sm font-semibold">Release 145</span>
          </div>
          <p class="text-xs text-muted-foreground">since 2 hours ago</p>
          <div class="mt-2"><Badges pill={{ kind: 'release', label: 'verified', locations: 1 }} /></div>
        </div>
      </div>
    </div>
  </div>

  <div class="relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-background shadow-xs">
    <header class="flex h-14 shrink-0 items-center gap-2 rounded-t-2xl border-b border-border bg-background/90 px-4">
      <span class="-ml-1 mr-1 inline-flex size-7 items-center justify-center rounded-full [&_svg]:size-4"><PanelLeftIcon /></span>
      <ol class="flex flex-wrap items-center gap-2.5 text-sm break-words text-muted-foreground">
        <li class="inline-flex items-center gap-1.5">Field Notes</li>
        {#each crumbs as crumb, index (index)}
          <li class="[&>svg]:size-3.5" role="presentation"><ChevronRightIcon /></li>
          <li class="inline-flex items-center gap-1.5 {index === crumbs.length - 1 ? 'font-normal text-foreground' : ''}">{crumb}</li>
        {/each}
      </ol>
      <div class="ml-auto flex items-center gap-1">
        <span
          class="inline-flex h-9 w-56 items-center justify-start gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft [&_svg]:size-4"
          ><SearchIcon />Search<kbd class="ml-auto font-sans text-sm">⌘K</kbd></span
        >
        <span class="inline-flex size-9 items-center justify-center rounded-full [&_svg]:size-4"><SunMoonIcon /></span>
        <span class="inline-flex size-9 items-center justify-center rounded-full [&_svg]:size-4"><UserRoundIcon /></span>
      </div>
    </header>
    <div class="mx-auto w-full max-w-6xl flex-1 px-10 py-8">
      {@render children()}
    </div>
  </div>
</div>
