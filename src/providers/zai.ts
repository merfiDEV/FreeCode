import type { Provider } from "../shared/types";
import { ZAI } from "../shared/constants";

/**
 * z.ai adapter.
 *
 * DOM notes (verified against chat.z.ai, Sept 2026):
 *   - AI replies:    .chat-assistant
 *   - user messages: .chat-user
 *   - code blocks:   div.language-<lang> (NO <pre>/<code>!), where the language
 *                    label is rendered in a sibling div.absolute
 *   - composer:      textarea#chat-input, button.sendMessageButton
 *     (the send button is disabled while the model is streaming)
 */
const MESSAGE_SELECTOR = ".chat-assistant";
const USER_SELECTOR = ".chat-user";
const INPUT_SELECTORS = ["#chat-input", "textarea.input-scroll", "textarea[placeholder]"];
const SEND_SELECTORS = ["button.sendMessageButton", "button[type='submit']"];

function firstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && isVisible(el)) return el as HTMLElement;
  }
  return null;
}

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Extract the raw source of every code block of a given language. */
export function getCodeBlocksByLang(root: HTMLElement, lang: string): string[] {
  const selector = "div.language-" + lang;
  return Array.from(root.querySelectorAll(selector))
    .map((el) => (el.textContent || "").trim())
    .filter(Boolean);
}

/** Language label of the block that a label element belongs to. */
export function getBlockLang(labelEl: Element): string {
  const block = labelEl.parentElement;
  if (!block) return "";
  const code = block.querySelector("[class*='language-']");
  if (!code) return "";
  const cls = Array.from(code.classList).find((c) => c.startsWith("language-"));
  return cls ? cls.replace("language-", "") : "";
}

export const zaiProvider: Provider = {
  id: "zai",
  name: "Z.ai",
  homeUrl: ZAI.homeUrl,
  host: ZAI.host,

  matchesUrl(url: string): boolean {
    return typeof url === "string" && url.includes(ZAI.host);
  },

  findInput(): HTMLElement | null {
    return firstVisible(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    const btn = firstVisible(SEND_SELECTORS) as HTMLButtonElement | null;
    if (btn && !btn.disabled) return btn;
    return null;
  },

  isElementVisible: isVisible,

  /**
   * z.ai swaps the composer's send button for a stop button while streaming:
   * `#send-message-button` is REMOVED from the DOM during generation and
   * restored once the reply finishes. So the presence of the send button
   * (regardless of its disabled state, which also depends on the empty input)
   * is our "not generating / finished" signal.
   */
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

  getMessageCandidates(): HTMLElement[] {
    return Array.from(document.querySelectorAll(MESSAGE_SELECTOR)) as HTMLElement[];
  },

  getMessageMarkdown(el: HTMLElement): HTMLElement | null {
    return el;
  },

  isUserMessage(el: HTMLElement): boolean {
    if (el.classList.contains("chat-user")) return true;
    return !!el.closest(USER_SELECTOR);
  },

  getCodeBlockLanguage(pre: Element): string {
    // z.ai does not use <pre>; the language lives in the block wrapper class.
    const code = pre.querySelector("[class*='language-']") ?? pre;
    const cls = Array.from(code.classList).find((c) => c.startsWith("language-"));
    return cls ? cls.replace("language-", "") : "";
  },
};
