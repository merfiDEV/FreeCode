import type { Provider } from "../shared/types";

/**
 * Qwen adapter (chat.qwen.ai).
 *
 * DOM notes (verified live, Sept 2026):
 *   - messages:   .qwen-chat-message-assistant / .qwen-chat-message-user
 *   - code block: pre.qwen-markdown-code; the language sits in
 *                 .qwen-markdown-code-header, the clean source in the
 *                 Monaco .view-line rows (textContent also carries line numbers)
 *   - composer:   textarea.message-input-textarea
 *   - send button: button.send-button
 *   - works without signing in (guest session), login is optional
 */

const HOST = "chat.qwen.ai";
const HOME_URL = "https://chat.qwen.ai/";

const ASSISTANT_SELECTOR = ".qwen-chat-message-assistant";
const USER_SELECTOR = ".qwen-chat-message-user";

const INPUT_SELECTORS = ["textarea.message-input-textarea", "textarea[placeholder]", "textarea"];
const SEND_SELECTORS = ["button.send-button", 'button[aria-label*="send" i]', 'button[type="submit"]'];

const LOGIN_UI_RE = /^\s*(log ?in|sign ?up|sign ?in|войти)\s*$/i;

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function firstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && isVisible(el)) return el as HTMLElement;
  }
  return null;
}

function isDisabled(el: Element): boolean {
  if (el instanceof HTMLButtonElement && el.disabled) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  return /(^|\s)(disabled|is-disabled)(\s|$)/.test(el.className || "");
}

/** Language label of a Qwen code block, read from its header. */
function codeBlockLang(pre: Element): string {
  const header = pre.querySelector(".qwen-markdown-code-header");
  if (header) {
    for (const div of Array.from(header.querySelectorAll("div"))) {
      const text = (div.textContent || "").trim();
      if (/^[a-zA-Z0-9_+#.-]{1,20}$/.test(text)) return text.toLowerCase();
    }
  }
  // Fallback: language is mirrored as a class on the code body.
  const body = pre.querySelector(".qwen-markdown-code-body");
  const cls = body ? Array.from(body.classList).find((c) => c !== "qwen-markdown-code-body") : undefined;
  return cls ? cls.toLowerCase() : "";
}

/** Clean source text of a Qwen code block (without line numbers). */
function codeBlockText(pre: Element): string {
  const lines = Array.from(pre.querySelectorAll(".view-line")).map((l) => l.textContent ?? "");
  if (lines.length > 0) return lines.join("\n");
  // Fallback when Monaco has not rendered rows yet.
  return (pre.textContent || "").trim();
}

export const qwenProvider: Provider = {
  id: "qwen",
  name: "Qwen",
  homeUrl: HOME_URL,
  authUrl: HOME_URL,
  host: HOST,
  partition: "persist:qwen",

  matchesUrl(url: string): boolean {
    return typeof url === "string" && url.includes(HOST);
  },

  // ---- Composer ----
  findInput(): HTMLElement | null {
    return firstVisible(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    for (const sel of SEND_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && !isDisabled(el)) return el as HTMLElement;
    }
    return null;
  },

  isElementVisible: isVisible,

  // ---- Streaming state ----
  /**
   * While the answer streams, Qwen swaps the send button for a stop button
   * (`button.stop-button`, aria-label "Stop") and removes .send-button from
   * the DOM entirely. Once the reply is finished the stop button disappears
   * and the send button returns (still disabled while the input is empty).
   *
   * So the reliable signal is the stop button, not the send button's state.
   */
  isResponseComplete(): boolean {
    try {
      if (document.querySelector("button.stop-button")) return false;
      // Guard against an empty chat: no assistant message means nothing to read.
      return !!document.querySelector(ASSISTANT_SELECTOR);
    } catch {
      return false;
    }
  },

  isGenerating(): boolean {
    try {
      return !!document.querySelector("button.stop-button");
    } catch {
      return false;
    }
  },

  // ---- Messages ----
  getMessageCandidates(): HTMLElement[] {
    return Array.from(document.querySelectorAll(ASSISTANT_SELECTOR)) as HTMLElement[];
  },

  isUserMessage(el: HTMLElement): boolean {
    if (el.classList.contains("qwen-chat-message-user")) return true;
    return !!el.closest(USER_SELECTOR);
  },

  getToolBlocks(root: HTMLElement, lang: string): string[] {
    const out: string[] = [];
    for (const pre of Array.from(root.querySelectorAll("pre.qwen-markdown-code"))) {
      if (codeBlockLang(pre) !== lang) continue;
      const text = codeBlockText(pre).trim();
      if (text) out.push(text);
    }
    return out;
  },

  // ---- Auth & routing ----
  /**
   * Qwen allows guest chats, so the app is usable without an account. A visible
   * "Log in" / "Sign up" entry point means the session is anonymous.
   */
  isLoggedIn(): boolean {
    try {
      const hasAuthButton = Array.from(document.querySelectorAll("button")).some((b) =>
        LOGIN_UI_RE.test((b.textContent || "").trim()),
      );
      return !hasAuthButton;
    } catch {
      return false;
    }
  },

  extractSessionId(url: string): string | null {
    if (!url) return null;
    const m = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },

  // ---- Presentation ----
  isDarkMode(): boolean {
    const html = document.documentElement;
    const body = document.body;
    return (
      html.classList.contains("dark") ||
      html.getAttribute("data-theme") === "dark" ||
      body.classList.contains("dark")
    );
  },
};
