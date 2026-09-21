/**
 * Shared type definitions.
 */

export type ToolStatus = "ok" | "error";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolCall {
  /** Tool name, e.g. "read". */
  toolName: string;
  /** Normalised parameters. */
  params: Record<string, unknown>;
  /** Unique call id (generated if the AI omitted it). */
  callId: string;
}

/** Minimal view of a site adapter used by the preload script. */
export interface Provider {
  id: string;
  name: string;
  homeUrl: string;
  host: string;
  matchesUrl(url: string): boolean;
  findInput(): HTMLElement | null;
  findSendButton(): HTMLElement | null;
  isElementVisible(el: Element | null): boolean;
  isResponseComplete(): boolean;
  isGenerating(): boolean;
  getMessageCandidates(): HTMLElement[];
  getMessageMarkdown(el: HTMLElement): HTMLElement | null;
  isUserMessage(el: HTMLElement): boolean;
  getCodeBlockLanguage(pre: Element): string;
}
