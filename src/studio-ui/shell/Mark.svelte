<!--
  Copied from Colophon (MIT): apps/studio/src/lib/shell/Mark.svelte and apps/studio/src/lib/colophon-mark.svg
  https://github.com/akira-shirase-oss/colophon-cms/blob/main/apps/studio/src/lib/shell/Mark.svelte

  Adapted: the mark's path is inline (the Studio loads the SVG file as an image), with no title,
  since every illustration it appears in is hidden from screen readers.
-->
<script lang="ts">
  let { size = 22 }: { size?: number } = $props()
</script>

<svg viewBox="0 0 292 310" width={size} height={Math.round(size * 1.1)} class="shrink-0" aria-hidden="true">
  <path fill="currentColor" d="M87 0H232L292 60L232 120L194 82H130L87 125V185L130 228H194L232 190L292 250L232 310H87L0 223V87Z" />
</svg>
