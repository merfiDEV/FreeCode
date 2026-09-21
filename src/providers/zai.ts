import type { Provider } from "../shared/types";

/**
 * Z.ai adapter.
 *
 * DOM notes (verified against chat.z.ai, Sept 2026):
 *   - AI replies:    .chat-assistant
 *   - user messages: .chat-user
 *   - code blocks:   div.language-<lang> (NO <pre>/<code>!)
 *   - composer:      textarea#chat-input, button.sendMessageButton
 *   - the send button (#send-message-button) is REMOVED from the DOM while the
 *     model streams, and restored once the reply finishes.
 */

const HOST = "chat.z.ai";
const HOME_URL = "https://chat.z.ai/";
const AUTH_URL = "https://chat.z.ai/auth";

const MESSAGE_SELECTOR = ".chat-assistant";
const USER_SELECTOR = ".chat-user";
const INPUT_SELECTORS = ["#chat-input", "textarea.input-scroll", "textarea[placeholder]"];
const SEND_SELECTORS = ["#send-message-button", "button.sendMessageButton", "button[type='submit']"];

const LOGIN_UI_RE = /^\s*(sign ?in|log ?in|войти|continue with(\s+\w+)?|skip for now)\s*$/i;

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

function hasLoginForm(): boolean {
  return !!document.querySelector(
    "input[type='password'], input[type='email'], input[name='password'], input[name='email']",
  );
}

function hasLoginUi(): boolean {
  return Array.from(document.querySelectorAll("button, a")).some((el) =>
    LOGIN_UI_RE.test((el.textContent || "").trim()),
  );
}

export const zaiProvider: Provider = {
  id: "zai",
  name: "Z.ai",
  homeUrl: HOME_URL,
  authUrl: AUTH_URL,
  host: HOST,
  partition: "persist:zai",

  matchesUrl(url: string): boolean {
    return typeof url === "string" && url.includes(HOST);
  },

  // ---- Composer ----
  findInput(): HTMLElement | null {
    return firstVisible(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    const btn = firstVisible(SEND_SELECTORS) as HTMLButtonElement | null;
    if (btn && !btn.disabled) return btn;
    return null;
  },

  isElementVisible: isVisible,

  // ---- Streaming state ----
  isResponseComplete(): boolean {
    try {
      return !!document.querySelector("#send-message-button, button.sendMessageButton");
    } catch {
      return false;
    }
  },

  isGenerating(): boolean {
    try {
      return !document.querySelector("#send-message-button, button.sendMessageButton");
    } catch {
      return false;
    }
  },

  // ---- Messages ----
  getMessageCandidates(): HTMLElement[] {
    return Array.from(document.querySelectorAll(MESSAGE_SELECTOR)) as HTMLElement[];
  },

  isUserMessage(el: HTMLElement): boolean {
    if (el.classList.contains("chat-user")) return true;
    return !!el.closest(USER_SELECTOR);
  },

  getToolBlocks(root: HTMLElement, lang: string): string[] {
    // z.ai renders code as div.language-<lang> without <pre>/<code>.
    const selector = "div.language-" + lang;
    return Array.from(root.querySelectorAll(selector))
      .map((el) => (el.textContent || "").trim())
      .filter(Boolean);
  },

  // ---- Auth & routing ----
  isLoggedIn(): boolean {
    try {
      if (location.href.startsWith(AUTH_URL)) return false;
      if (hasLoginForm() || hasLoginUi()) return false;
      const token = localStorage.getItem("token");
      return !!token && token.length >= 20;
    } catch {
      return false;
    }
  },

  extractSessionId(url: string): string | null {
    if (!url) return null;
    const m = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    return m ? m[1] : null;
  },

  // ---- Presentation ----
  isDarkMode(): boolean {
    const html = document.documentElement;
    return html.classList.contains("dark") || html.getAttribute("data-theme") === "dark";
  },
};
