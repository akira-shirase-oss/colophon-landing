<!--
  Copied from Colophon (MIT), three small status pills in one file:
  - apps/studio/src/lib/shell/StatusBadge.svelte (an entry's standing with readers)
  - apps/studio/src/lib/shell/ChangesetBadge.svelte (a publish request's state, words from lib/words.ts)
  - apps/studio/src/lib/shell/ReleaseLabel.svelte (a release's label, words from lib/receipts.ts)
  https://github.com/akira-shirase-oss/colophon-cms/tree/main/apps/studio/src/lib/shell

  Adapted: the three share this file and take plain values instead of API records.
-->
<script lang="ts" module>
  export type Pill =
    | { kind: 'entry'; state: 'draft' | 'live' | 'changed' }
    | { kind: 'request'; state: 'open' | 'awaiting_review' | 'changes_requested' | 'approved' | 'published' }
    | { kind: 'release'; label: 'published' | 'pending' | 'verified' | 'needs_attention'; locations?: number }
</script>

<script lang="ts">
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check'
  import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
  import Badge from '../ui/Badge.svelte'

  let { pill }: { pill: Pill } = $props()

  // StatusBadge: where an entry stands for readers, as a word with a mark, never colour alone.
  const ENTRY = {
    draft: { variant: 'draft', text: 'Draft', dot: 'bg-draft' },
    live: { variant: 'live', text: 'Live', dot: 'bg-live' },
    changed: { variant: 'pending', text: 'Changed', dot: 'bg-pending' },
  } as const

  // ChangesetBadge's VARIANT with REQUEST_STATE's words.
  const REQUEST = {
    open: { variant: 'draft', text: 'Not sent for review' },
    awaiting_review: { variant: 'pending', text: 'Waiting for review' },
    changes_requested: { variant: 'attention', text: 'Changes asked for' },
    approved: { variant: 'live', text: 'Approved' },
    published: { variant: 'outline', text: 'Published' },
  } as const

  // ReleaseLabel's LOOK with labelText's words; "Verified" always says how many locations looked.
  const RELEASE = {
    published: { variant: 'draft', icon: CircleDashedIcon },
    pending: { variant: 'pending', icon: ClockIcon },
    verified: { variant: 'live', icon: BadgeCheckIcon },
    needs_attention: { variant: 'attention', icon: TriangleAlertIcon },
  } as const
  const releaseText = (label: string, locations = 1) =>
    label === 'published'
      ? 'Published in Colophon'
      : label === 'pending'
        ? 'Website update pending'
        : label === 'verified'
          ? `Verified at ${locations} ${locations === 1 ? 'location' : 'locations'}`
          : 'Needs attention'
</script>

{#if pill.kind === 'entry'}
  {@const look = ENTRY[pill.state]}
  <Badge variant={look.variant}><span class="size-1.5 rounded-full {look.dot}"></span>{look.text}</Badge>
{:else if pill.kind === 'request'}
  <Badge variant={REQUEST[pill.state].variant}>{REQUEST[pill.state].text}</Badge>
{:else}
  {@const look = RELEASE[pill.label]}
  <Badge variant={look.variant}><look.icon />{releaseText(pill.label, pill.locations)}</Badge>
{/if}
