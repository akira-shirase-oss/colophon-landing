<!--
  The Studio's main panel: the white page inside the project shell, as in
  apps/studio/src/routes/projects/[project]/+layout.svelte (MIT), copied from Colophon.
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/routes/projects/%5Bproject%5D/%2Blayout.svelte

  Adapted for the illustrations, which crop to the page itself: the sidebar and the header bar
  are left out, and the panel is a size container, so the copied components' responsive
  variants answer to the window's width (`@xl:` and so on) instead of the screen's.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="@container h-full w-full overflow-clip bg-background text-foreground">
  <div class="px-5 py-6 @2xl:px-8 @2xl:py-7">
    {@render children()}
  </div>
</div>
