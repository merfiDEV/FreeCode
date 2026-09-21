import { getProviderByUrl } from "../providers";

/** Low-level helpers for putting text into the z.ai composer and sending it. */

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
  const input = provider?.findInput() ?? (document.querySelector("#chat-input") as HTMLElement | null);
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

/** Click the send button if present; otherwise fall back to Enter. */
export function pressSend(): boolean {
  const provider = currentProvider();
  const btn =
    provider?.findSendButton() ??
    (document.querySelector("#send-message-button, button.sendMessageButton") as HTMLButtonElement | null);
  if (btn && !(btn as HTMLButtonElement).disabled) {
    btn.click();
    return true;
  }
  const input = provider?.findInput();
  if (input) {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
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
