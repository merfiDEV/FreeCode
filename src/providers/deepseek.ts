import type { Provider } from "../shared/types";

/**
 * DeepSeek adapter (chat.deepseek.com).
 *
 * DOM notes (verified live, Sept 2026):
 *   - messages:   .ds-message; the assistant variant contains .ds-markdown,
 *                 user messages do not.
 *   - code block: .md-code-block > .md-code-block-banner (.md-code-block-banner-lite)
 *                 with a <span> holding the language, followed by a <pre>.
 *   - composer:   textarea (last resort selector), send button is a DIV:
 *                 div.ds-button--primary.ds-button--filled.ds-button--circle
 *   - finished replies expose action buttons under the message:
 *                 [role="button"].ds-button--iconLabelTertiary (>= 2)
 */

const HOST = "chat.deepseek.com";
const HOME_URL = "https://chat.deepseek.com/";

const MESSAGE_SELECTOR = ".ds-message";
const MARKDOWN_SELECTOR = ".ds-markdown";
const CODE_BLOCK_SELECTOR = ".md-code-block";
const ACTION_BTN_SELECTOR = '[role="button"].ds-button--iconLabelTertiary';

const INPUT_SELECTORS = [
  'textarea[placeholder*="message"]',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Сообщение"]',
  'textarea[placeholder*="输入"]',
  "textarea.chat-input",
  "textarea",
];

// The send button is a DIV (not a <button>) with these classes.
const SEND_SELECTORS = [
  "div.ds-button--primary.ds-button--filled.ds-button--circle",
  "div.ds-button--primary.ds-button--filled",
  'button[type="submit"]',
];

const LOGIN_UI_RE = /^\s*(sign ?in|log ?in|войти|continue with(\s+\w+)?)\s*$/i;

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
  // DeepSeek toggles a --disabled modifier class on its DIV buttons.
  return /(^|\s)ds-button--disabled(\s|$)/.test(el.className || "");
}

/** Read the language label of a DeepSeek code block. */
function codeBlockLang(pre: Element): string {
  let lang = pre.getAttribute("data-language") || "";
  if (!lang) {
    const parent = pre.closest("div[data-language]");
    if (parent) lang = parent.getAttribute("data-language") || "";
  }
  if (!lang) {
    const code = pre.querySelector("code");
    const cls = code ? Array.from(code.classList).find((c) => c.startsWith("language-")) : undefined;
    if (cls) lang = cls.replace("language-", "");
  }
  if (!lang) {
    // New layout: the language sits in the block banner as plain text.
    const block = pre.closest(CODE_BLOCK_SELECTOR);
    const banner = block?.querySelector(".md-code-block-banner");
    if (banner) {
      for (const span of Array.from(banner.querySelectorAll("span"))) {
        if (span.closest("button, [role=button]")) continue;
        const text = (span.textContent || "").trim();
        if (/^[a-zA-Z0-9_+#.-]{1,20}$/.test(text)) {
          lang = text;
          break;
        }
      }
    }
  }
  return (lang || "").toLowerCase();
}

export const deepseekProvider: Provider = {
  id: "deepseek",
  name: "DeepSeek",
  homeUrl: HOME_URL,
  authUrl: HOME_URL,
  host: HOST,
  partition: "persist:deepseek",

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
   * A reply is finished once the action buttons (copy / read aloud / retry)
   * appear under the last message. While the model streams, those buttons are
   * absent and the send button is replaced by a stop button.
   */
  isResponseComplete(): boolean {
    try {
      const msgs = document.querySelectorAll(MESSAGE_SELECTOR);
      if (msgs.length === 0) return false;
      const last = msgs[msgs.length - 1];
      const scope = last.parentElement || last;
      return scope.querySelectorAll(ACTION_BTN_SELECTOR).length >= 2;
    } catch {
      return false;
    }
  },

  isGenerating(): boolean {
    return !this.isResponseComplete();
  },

  // ---- Messages ----
  getMessageCandidates(): HTMLElement[] {
    // Assistant messages contain a markdown body; user messages do not.
    return Array.from(document.querySelectorAll(MESSAGE_SELECTOR)).filter(
      (el) => !!el.querySelector(MARKDOWN_SELECTOR),
    ) as HTMLElement[];
  },

  isUserMessage(el: HTMLElement): boolean {
    return !el.querySelector(MARKDOWN_SELECTOR);
  },

  getToolBlocks(root: HTMLElement, lang: string): string[] {
    const out: string[] = [];
    for (const pre of Array.from(root.querySelectorAll("pre"))) {
      if (codeBlockLang(pre) !== lang) continue;
      // Strip a leading fence line if the model echoed it.
      let text = (pre.textContent || "").trim();
      text = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
      if (text) out.push(text);
    }
    return out;
  },

  // ---- Auth & routing ----
  /**
   * DeepSeek keeps the session in cookies, and the logged-in chat page has no
   * reliable localStorage token, so we key off the absence of a login form.
   */
  isLoggedIn(): boolean {
    try {
      if (location.pathname.includes("sign_in")) return false;
      if (document.querySelector("input[type='password'], input[type='email']")) return false;

      const hasLoginUi = Array.from(document.querySelectorAll("button, a")).some((el) =>
        LOGIN_UI_RE.test((el.textContent || "").trim()),
      );
      const hasMessages = !!document.querySelector(MESSAGE_SELECTOR);
      if (hasLoginUi && !hasMessages) return false;

      return true;
    } catch {
      return false;
    }
  },

  extractSessionId(url: string): string | null {
    if (!url) return null;
    const m = url.match(/\/a\/chat\/s\/([a-f0-9-]+)/i) || url.match(/\/s\/([a-f0-9-]+)/i);
    return m ? m[1] : null;
  },

  // ---- Presentation ----
  /**
   * DeepSeek marks dark mode on <body>, not <html>:
   *   body.class contains "dark", and body has data-ds-dark-theme="dark".
   */
  isDarkMode(): boolean {
    const html = document.documentElement;
    const body = document.body;
    return (
      html.classList.contains("dark") ||
      html.getAttribute("data-theme") === "dark" ||
      html.getAttribute("data-color-scheme") === "dark" ||
      body.classList.contains("dark") ||
      body.getAttribute("data-ds-dark-theme") === "dark"
    );
  },
};
