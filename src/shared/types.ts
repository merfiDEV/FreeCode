/**
 * Shared type definitions.
 */

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * A chat-site adapter. Everything specific to one web chat (selectors, URLs,
 * auth detection, theme detection) lives behind this interface so the rest of
 * the app stays site-agnostic.
 *
 * Methods run inside the preload script and have direct DOM access.
 */
export interface Provider {
  /** Stable id used in settings and storage keys, e.g. "zai". */
  id: string;
  /** Human-readable name shown in the UI, e.g. "Z.ai". */
  name: string;
  /** Chat start page for a signed-in user. */
  homeUrl: string;
  /** Page the user is sent to when not signed in. */
  authUrl: string;
  /** Hostname used for URL matching and partition naming. */
  host: string;
  /** Electron session partition, e.g. "persist:zai". */
  partition: string;

  /** Does this provider own the given page URL? */
  matchesUrl(url: string): boolean;

  // ---- Composer ----
  findInput(): HTMLElement | null;
  findSendButton(): HTMLElement | null;
  isElementVisible(el: Element | null): boolean;

  // ---- Streaming state ----
  /** True when the assistant has finished its current reply. */
  isResponseComplete(): boolean;
  /** True while the assistant is streaming a reply. */
  isGenerating(): boolean;

  // ---- Messages ----
  /** Assistant message containers, in DOM order. */
  getMessageCandidates(): HTMLElement[];
  /** Is this element part of a user (not assistant) message? */
  isUserMessage(el: HTMLElement): boolean;
  /**
   * Extract the source of every fenced code block of the given language
   * from an assistant message container.
   */
  getToolBlocks(root: HTMLElement, lang: string): string[];

  // ---- Auth & routing ----
  /**
   * Is the current page an authenticated session?
   * A guest token alone must not count as signed in.
   */
  isLoggedIn(): boolean;
  /** Session id of the conversation shown in the given URL, or null. */
  extractSessionId(url: string): string | null;

  // ---- Presentation ----
  /** Is the host page currently in dark mode? Used by the overlay. */
  isDarkMode(): boolean;
}
