// Copied from Colophon (MIT): packages/ui/src/lib/utils.ts
// https://github.com/akira-shirase-oss/colophon-cms/blob/main/packages/ui/src/lib/utils.ts
//
// Adapted for these build-time illustrations: Colophon's `cn` merges class names and resolves
// Tailwind conflicts through the `cn` package. The illustrations never pass a conflicting class,
// so a plain join gives the same class list without a runtime dependency.

/** Joins class names, skipping empty ones. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
