/**
 * Minimal type declaration for @joplin/turndown-plugin-gfm.
 * The package ships without types; we only use the `gfm` plugin.
 */
declare module "@joplin/turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  export const gfm: TurndownService.Plugin;
  export const tables: TurndownService.Plugin;
  export const strikethrough: TurndownService.Plugin;
  export const taskListItems: TurndownService.Plugin;
  export const highlightedCodeBlock: TurndownService.Plugin;
}
