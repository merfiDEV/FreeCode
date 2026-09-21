import { getProviderByUrl } from "../providers";

/** Low-level helpers for putting text into the composer and sending it. */

let sendDelayMin = 2000;
let sendDelayMax = 5900;

/** Update the random delay applied before pressing send (ms). */
export function setSendDelayRange(min: number, max: number): void {
  if (Number.isFinite(min) && min >= 0) sendDelayMin = min;
  if (Number.isFinite(max) && max >= min) sendDelayMax = max;
}

function randomDelay(): number {
  if (sendDelayMax <= sendDelayMin) return sendDelayMin;
  return Math.floor(Math.random() * (sendDelayMax - sendDelayMin)) + sendDelayMin;
}

function currentProvider() {
  return getProviderByUrl(location.href);
}

function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Fill the composer with text (does not send). */
export function fillInput(text: string): boolean {
  const provider = currentProvider();
  const input = provider?.findInput() ?? null;
  if (!input) {
    console.warn("[freecode] chat input not found");
    return false;
  }
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    input.focus();
    setNativeValue(input, text);
    return true;
  }
  input.focus();
  input.textContent = text;
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  return true;
}

/**
 * Submit the composer.
 *
 * A real <button> is clicked directly. Some sites (DeepSeek) render the send
 * control as a <div role="button">, where .click() is unreliable — there we
 * press Enter on the input instead.
 */
export function pressSend(): boolean {
  const provider = currentProvider();
  const btn = provider?.findSendButton();
  if (btn instanceof HTMLButtonElement && !btn.disabled) {
    btn.click();
    return true;
  }
  const input = provider?.findInput();
  if (input) {
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true, cancelable: true }));
    return true;
  }
  // Last resort: click whatever control the provider found, even if it is a DIV.
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

/** Convenience: fill the composer and submit in one call. */
export function sendMessage(text: string): boolean {
  if (!fillInput(text)) return false;
  // Wait a random delay so the input change is noticed and the send button
  // becomes enabled, mimicking human pacing.
  setTimeout(() => pressSend(), randomDelay());
  return true;
}
