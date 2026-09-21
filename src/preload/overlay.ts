/**
 * Side overlay panel styled after Material Design 3 (mint / seafoam).
 * Adopts a dark palette automatically when the host page is in dark mode.
 * Shows the project directory, send-delay settings, a language switch, a
 * collapse button, and live panels for the current task and its result.
 */
import { sendMessage } from "./chat-input";
import { ipc } from "./ipc";
import { t, setLanguage, detectLanguage, getLanguage, type Language } from "./i18n";

let panel: HTMLElement | null = null;
let toggleBtn: HTMLButtonElement | null = null;

// Elements whose text depends on the current language.
let projectHeadingEl: HTMLElement | null = null;
let projectDirEl: HTMLElement | null = null;
let changeBtn: HTMLButtonElement | null = null;
let langBtn: HTMLButtonElement | null = null;
let collapseBtn: HTMLButtonElement | null = null;
let delayHeadingEl: HTMLElement | null = null;
let delayToEl: HTMLElement | null = null;
let delaySecEl: HTMLElement | null = null;
let saveLinkEl: HTMLButtonElement | null = null;
let delayStatusEl: HTMLElement | null = null;
let taskHeadingEl: HTMLElement | null = null;
let resultHeadingEl: HTMLElement | null = null;
let resultStatusTextEl: HTMLElement | null = null;

let delayMinInput: HTMLInputElement | null = null;
let delayMaxInput: HTMLInputElement | null = null;

let taskSep: HTMLElement | null = null;
let taskBox: HTMLElement | null = null;
let taskCodeEl: HTMLElement | null = null;
let resultSep: HTMLElement | null = null;
let resultBox: HTMLElement | null = null;
let resultTextEl: HTMLElement | null = null;
let statusIconEl: HTMLElement | null = null;

let projectDirCache: string | null = null;
let lastResult: { ok: boolean; text: string } | null = null;

const STYLE = `
#freecode-overlay {
  /* Light mint palette (Material Design 3) */
  --fc-panel-bg: #edf8f3;
  --fc-panel-border: #a8d9c4;
  --fc-heading: #0f3829;
  --fc-text: #0f3829;
  --fc-muted-text: #265945;
  --fc-chip-bg: #d2ece0;
  --fc-chip-border: #9dcfb9;
  --fc-chip-text: #0f3829;
  --fc-chip-hover: #bde4d2;
  --fc-btn-bg: #85cfaf;
  --fc-btn-border: #70bd9b;
  --fc-btn-hover: #72c3a1;
  --fc-btn-text: #0f3829;
  --fc-path: #0f6844;
  --fc-divider: #bfe3d3;
  --fc-input-bg: #f7fcf9;
  --fc-input-border: #9dcfb9;
  --fc-input-text: #0f3829;
  --fc-input-focus: #4dae84;
  --fc-link: #145d3e;
  --fc-link-hover: #0a3824;
  --fc-code-bg: #103023;
  --fc-code-border: #1e4e3b;
  --fc-code-text: #c3f2dc;
  --fc-result-bg: #dcf2e7;
  --fc-result-border: #add9c5;
  --fc-result-text: #2b664f;
  --fc-ok-bg: #106b47;
  --fc-ok-text: #106b47;
  --fc-err-bg: #b3261e;
  --fc-err-text: #b3261e;

  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 300px;
  max-width: calc(100vw - 32px);
  max-height: 85vh;
  overflow-y: auto;
  box-sizing: border-box;
  font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--fc-text);
  background: var(--fc-panel-bg);
  border: 1px solid var(--fc-panel-border);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 20px 25px -5px rgba(16, 56, 43, 0.18), 0 8px 10px -6px rgba(16, 56, 43, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-font-smoothing: antialiased;
}

/* Dark mint palette — applied when the host page is dark. */
#freecode-overlay.fc-dark {
  --fc-panel-bg: #0e2018;
  --fc-panel-border: #234a3b;
  --fc-heading: #d7f5e7;
  --fc-text: #cfe9dc;
  --fc-muted-text: #8dbfa9;
  --fc-chip-bg: #1c3d30;
  --fc-chip-border: #2f5c49;
  --fc-chip-text: #d9fbea;
  --fc-chip-hover: #245040;
  --fc-btn-bg: #1f5c44;
  --fc-btn-border: #2c7357;
  --fc-btn-hover: #27694e;
  --fc-btn-text: #e6fff4;
  --fc-path: #7fe3b3;
  --fc-divider: #214435;
  --fc-input-bg: #10281f;
  --fc-input-border: #2c5a48;
  --fc-input-text: #e6fff4;
  --fc-input-focus: #4dae84;
  --fc-link: #7fe3b3;
  --fc-link-hover: #a8f5d0;
  --fc-code-bg: #0a1a13;
  --fc-code-border: #1e4e3b;
  --fc-code-text: #98f4cc;
  --fc-result-bg: #12291f;
  --fc-result-border: #234a3b;
  --fc-result-text: #a7d8c4;
  --fc-ok-bg: #106b47;
  --fc-ok-text: #7fe3b3;
  --fc-err-bg: #b3261e;
  --fc-err-text: #ff9b9b;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
}

#freecode-overlay.fc-collapsed { display: none; }
#freecode-overlay *, #freecode-overlay *::before, #freecode-overlay *::after {
  box-sizing: border-box;
}

#freecode-overlay .fc-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

#freecode-overlay .fc-heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fc-heading);
  margin: 0;
}

#freecode-overlay .fc-headrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

#freecode-overlay .fc-lang-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

#freecode-overlay .fc-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--fc-chip-bg);
  color: var(--fc-chip-text);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--fc-chip-border);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
#freecode-overlay .fc-chip:hover { background: var(--fc-chip-hover); }

#freecode-overlay .fc-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--fc-chip-bg);
  color: var(--fc-chip-text);
  border: 1px solid var(--fc-chip-border);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}
#freecode-overlay .fc-icon-btn:hover { background: var(--fc-chip-hover); }
#freecode-overlay .fc-icon-btn svg { width: 14px; height: 14px; fill: currentColor; }

#freecode-overlay .fc-change-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 15px;
  border-radius: 12px;
  background: var(--fc-btn-bg);
  color: var(--fc-btn-text);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--fc-btn-border);
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  transition: background 0.15s, transform 0.1s;
}
#freecode-overlay .fc-change-btn:hover { background: var(--fc-btn-hover); }
#freecode-overlay .fc-change-btn:active { transform: scale(0.98); }
#freecode-overlay .fc-change-btn:disabled { opacity: 0.55; cursor: default; }

#freecode-overlay .fc-path {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-path);
  word-break: break-all;
  user-select: text;
  letter-spacing: -0.01em;
}

#freecode-overlay .fc-divider {
  border: none;
  border-top: 1px solid var(--fc-divider);
  margin: 0 -3px;
  width: calc(100% + 6px);
}

#freecode-overlay .fc-delay-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
#freecode-overlay .fc-delay-row input {
  width: 54px;
  text-align: center;
  background: var(--fc-input-bg);
  border: 1px solid var(--fc-input-border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--fc-input-text);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#freecode-overlay .fc-delay-row input:focus {
  border-color: var(--fc-input-focus);
  box-shadow: 0 0 0 1px var(--fc-input-focus);
}
#freecode-overlay .fc-delay-row input::-webkit-inner-spin-button,
#freecode-overlay .fc-delay-row input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
#freecode-overlay .fc-delay-row input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
#freecode-overlay .fc-delay-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fc-muted-text);
}

#freecode-overlay .fc-save-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
#freecode-overlay .fc-save-link {
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-link);
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
}
#freecode-overlay .fc-save-link:hover {
  color: var(--fc-link-hover);
  background: rgba(77, 174, 132, 0.1);
}

/* Task code block — dark surface in both themes. */
#freecode-overlay .fc-code-box {
  background: var(--fc-code-bg);
  border: 1px solid var(--fc-code-border);
  border-radius: 12px;
  padding: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 10px;
  line-height: 1.55;
  color: var(--fc-code-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  user-select: text;
}
#freecode-overlay .fc-code-box code {
  font-family: inherit;
  background: none;
  padding: 0;
  color: inherit;
}

/* Result output block — soft surface, distinct from the code block. */
#freecode-overlay .fc-result-box {
  background: var(--fc-result-bg);
  border: 1px solid var(--fc-result-border);
  border-radius: 12px;
  padding: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 11px;
  line-height: 1.55;
  color: var(--fc-result-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  user-select: text;
}

#freecode-overlay .fc-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
#freecode-overlay .fc-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--fc-ok-bg);
  color: #fff;
  flex-shrink: 0;
}
#freecode-overlay .fc-status-icon.fc-err-bg { background: var(--fc-err-bg); }
#freecode-overlay .fc-status-icon svg {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}
#freecode-overlay .fc-status-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-ok-text);
}
#freecode-overlay .fc-status-text.fc-err { color: var(--fc-err-text); }

#freecode-overlay .fc-muted { opacity: 0.6; }
#freecode-overlay .fc-hidden { display: none !important; }

#freecode-toggle {
  --fc-toggle-bg: #edf8f3;
  --fc-toggle-border: #82cbab;
  --fc-toggle-text: #0f3829;
  --fc-toggle-hover: #dcf2e7;

  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  cursor: pointer;
  font-family: 'Roboto', 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--fc-toggle-text);
  background: var(--fc-toggle-bg);
  border: 1px solid var(--fc-toggle-border);
  border-radius: 24px;
  padding: 10px 16px;
  box-shadow: 0 10px 15px -3px rgba(16, 56, 43, 0.2);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
#freecode-toggle:hover { background: var(--fc-toggle-hover); }
#freecode-toggle.fc-dark {
  --fc-toggle-bg: #0e2018;
  --fc-toggle-border: #2f5c49;
  --fc-toggle-text: #d9fbea;
  --fc-toggle-hover: #163026;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}
#freecode-toggle.fc-hidden { display: none; }
`;

const SVG_NS = "http://www.w3.org/2000/svg";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgIcon(viewBox: string, pathD: string, stroke = false): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  if (stroke) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  return svg;
}

function injectStyles(): void {
  if (document.getElementById("freecode-style")) return;
  const style = document.createElement("style");
  style.id = "freecode-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function injectFonts(): void {
  if (document.getElementById("freecode-fonts")) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "";
  const link = document.createElement("link");
  link.id = "freecode-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Roboto:wght@400;500;700&display=swap";
  document.head.append(pre1, pre2, link);
}

// ===== Theme =====

/** True when the host page is in dark mode (z.ai sets class="dark" on <html>). */
function isDarkPage(): boolean {
  const html = document.documentElement;
  return html.classList.contains("dark") || html.getAttribute("data-theme") === "dark";
}

/** Mirror the page theme onto the overlay panel and launcher. */
function applyTheme(): void {
  const dark = isDarkPage();
  panel?.classList.toggle("fc-dark", dark);
  toggleBtn?.classList.toggle("fc-dark", dark);
}

/** Keep the overlay theme in sync with the page. */
function watchTheme(): void {
  const observer = new MutationObserver(() => applyTheme());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
}

// ===== Collapse / expand =====

function setCollapsed(value: boolean): void {
  panel?.classList.toggle("fc-collapsed", value);
  toggleBtn?.classList.toggle("fc-hidden", !value);
}

// ===== Language =====

/** Current language shown on the chip. */
function langBadge(): string {
  return getLanguage().toUpperCase();
}

/** Re-apply all translated strings to the existing DOM. */
function applyTranslations(): void {
  if (projectHeadingEl) projectHeadingEl.textContent = t("overlay.project.heading");
  if (changeBtn && !changeBtn.disabled) changeBtn.textContent = t("overlay.project.change");
  if (projectDirEl) projectDirEl.textContent = projectDirCache ?? t("overlay.project.none");
  if (delayHeadingEl) delayHeadingEl.textContent = t("overlay.delay.heading");
  if (delayToEl) delayToEl.textContent = t("overlay.delay.to");
  if (delaySecEl) delaySecEl.textContent = t("overlay.delay.sec");
  if (saveLinkEl) saveLinkEl.textContent = t("overlay.delay.save");
  if (delayStatusEl) delayStatusEl.textContent = t("overlay.delay.saved");
  if (taskHeadingEl) taskHeadingEl.textContent = t("overlay.task.heading");
  if (resultHeadingEl) resultHeadingEl.textContent = t("overlay.result.heading");
  if (langBtn) {
    langBtn.textContent = langBadge();
    langBtn.title = t("overlay.lang.switch");
  }
  if (collapseBtn) collapseBtn.title = t("overlay.collapse");
  if (toggleBtn) toggleBtn.title = t("overlay.expandTitle");

  // Status line: either the last result or the empty placeholder.
  if (resultStatusTextEl) {
    if (lastResult) {
      resultStatusTextEl.textContent = t(
        lastResult.ok ? "overlay.result.success" : "overlay.result.error",
      );
      resultStatusTextEl.className = "fc-status-text" + (lastResult.ok ? "" : " fc-err");
      if (statusIconEl) statusIconEl.classList.toggle("fc-err-bg", !lastResult.ok);
    } else {
      resultStatusTextEl.textContent = t("overlay.result.empty");
      resultStatusTextEl.className = "fc-status-text fc-muted";
    }
  }
}

async function handleToggleLanguage(): Promise<void> {
  const next: Language = getLanguage() === "en" ? "ru" : "en";
  setLanguage(next);
  applyTranslations();
  try {
    await ipc.setSettings({ language: next });
  } catch (err) {
    console.error("[freecode] failed to save language:", err);
  }
}

// ===== Project directory =====

export async function refreshProjectDir(): Promise<void> {
  try {
    projectDirCache = await ipc.getProjectDir();
  } catch {
    projectDirCache = null;
  }
  if (projectDirEl) projectDirEl.textContent = projectDirCache ?? t("overlay.project.none");
}

async function handleChangeProject(): Promise<void> {
  if (!changeBtn) return;
  changeBtn.disabled = true;
  changeBtn.textContent = t("overlay.project.selecting");
  try {
    const res = await ipc.initProject();
    if (res.canceled) return;
    await refreshProjectDir();
    if (res.prompt) {
      const sent = sendMessage(res.prompt);
      if (!sent) console.warn("[freecode] failed to send the prompt into the chat");
    }
  } catch (err) {
    console.error("[freecode] initProject error:", err);
    projectDirCache = null;
    if (projectDirEl) projectDirEl.textContent = t("overlay.project.error") + ": " + (err as Error).message;
  } finally {
    if (changeBtn) {
      changeBtn.disabled = false;
      changeBtn.textContent = t("overlay.project.change");
    }
  }
}

// ===== Send delay =====

async function loadDelay(): Promise<void> {
  try {
    const s = await ipc.getSettings();
    if (delayMinInput) delayMinInput.value = String(s.sendDelayMin);
    if (delayMaxInput) delayMaxInput.value = String(s.sendDelayMax);
  } catch {
    /* keep defaults */
  }
}

async function saveDelay(): Promise<void> {
  const min = Number(delayMinInput?.value ?? 0);
  const max = Number(delayMaxInput?.value ?? 0);
  try {
    const saved = await ipc.setSettings({ sendDelayMin: min, sendDelayMax: max });
    if (delayMinInput) delayMinInput.value = String(saved.sendDelayMin);
    if (delayMaxInput) delayMaxInput.value = String(saved.sendDelayMax);
    if (delayStatusEl) {
      delayStatusEl.textContent = t("overlay.delay.saved");
      delayStatusEl.classList.remove("fc-hidden");
      setTimeout(() => delayStatusEl?.classList.add("fc-hidden"), 1500);
    }
  } catch (err) {
    console.error("[freecode] failed to save delay:", err);
  }
}

/** Random delay range (ms) used by the chat-input module before pressing send. */
export async function getSendDelayRange(): Promise<{ min: number; max: number }> {
  try {
    const s = await ipc.getSettings();
    return { min: s.sendDelayMin * 1000, max: s.sendDelayMax * 1000 };
  } catch {
    return { min: 2000, max: 5900 };
  }
}

// ===== Task + result panels =====

/** Show the JS code of the task currently being executed. */
export function showTask(code: string): void {
  if (!taskBox || !taskCodeEl) return;
  taskCodeEl.textContent = code;
  taskSep?.classList.remove("fc-hidden");
  taskBox.classList.remove("fc-hidden");
  hideResult();
}

/** Show the result of the last execution. */
export function showResult(ok: boolean, text: string): void {
  if (!resultBox || !resultTextEl || !resultStatusTextEl) return;
  lastResult = { ok, text };
  resultStatusTextEl.textContent = t(ok ? "overlay.result.success" : "overlay.result.error");
  resultStatusTextEl.className = "fc-status-text" + (ok ? "" : " fc-err");
  statusIconEl?.classList.toggle("fc-err-bg", !ok);
  resultTextEl.textContent = text;
  resultSep?.classList.remove("fc-hidden");
  resultBox.classList.remove("fc-hidden");
}

export function hideResult(): void {
  resultSep?.classList.add("fc-hidden");
  resultBox?.classList.add("fc-hidden");
}

/**
 * Clear the task and result panels — called when the active conversation
 * changes so stale output from a previous chat is never shown.
 */
export function resetTaskPanels(): void {
  lastResult = null;
  taskSep?.classList.add("fc-hidden");
  taskBox?.classList.add("fc-hidden");
  resultSep?.classList.add("fc-hidden");
  resultBox?.classList.add("fc-hidden");
  if (taskCodeEl) taskCodeEl.textContent = "";
  if (resultTextEl) resultTextEl.textContent = "(no output)";
  if (resultStatusTextEl) {
    resultStatusTextEl.textContent = t("overlay.result.empty");
    resultStatusTextEl.className = "fc-status-text fc-muted";
  }
  statusIconEl?.classList.remove("fc-err-bg");
}

// ===== Mount =====

/** Build the overlay panel. Idempotent — safe to call multiple times. */
export function injectOverlay(): void {
  if (panel) return;
  injectStyles();
  injectFonts();

  const root = el("div");
  root.id = "freecode-overlay";

  // --- Directory section ---
  const dirSection = el("section", "fc-section");

  const dirHeadRow = el("div", "fc-headrow");
  projectHeadingEl = el("h2", "fc-heading", t("overlay.project.heading"));

  const langGroup = el("div", "fc-lang-group");
  langBtn = el("button", "fc-chip", langBadge());
  langBtn.type = "button";
  langBtn.title = t("overlay.lang.switch");
  langBtn.addEventListener("click", () => void handleToggleLanguage());

  collapseBtn = el("button", "fc-icon-btn");
  collapseBtn.type = "button";
  collapseBtn.title = t("overlay.collapse");
  collapseBtn.setAttribute("aria-label", t("overlay.collapse"));
  collapseBtn.appendChild(svgIcon("0 0 24 24", "M7 10l5 5 5-5z"));
  collapseBtn.addEventListener("click", () => setCollapsed(true));

  langGroup.append(langBtn, collapseBtn);
  dirHeadRow.append(projectHeadingEl, langGroup);
  dirSection.appendChild(dirHeadRow);

  const changeRow = el("div");
  changeBtn = el("button", "fc-change-btn");
  changeBtn.type = "button";
  changeBtn.textContent = t("overlay.project.change");
  changeBtn.addEventListener("click", () => void handleChangeProject());
  changeRow.appendChild(changeBtn);
  dirSection.appendChild(changeRow);

  projectDirEl = el("div", "fc-path", t("overlay.project.none"));
  dirSection.appendChild(projectDirEl);

  // --- Send delay section ---
  const delaySection = el("section", "fc-section");
  delayHeadingEl = el("h2", "fc-heading", t("overlay.delay.heading"));
  delaySection.appendChild(delayHeadingEl);

  const delayRow = el("div", "fc-delay-row");
  delayMinInput = el("input");
  delayMinInput.type = "number";
  delayMinInput.min = "0";
  delayMinInput.step = "0.1";
  delayMaxInput = el("input");
  delayMaxInput.type = "number";
  delayMaxInput.min = "0";
  delayMaxInput.step = "0.1";
  delayToEl = el("span", "fc-delay-label", t("overlay.delay.to"));
  delaySecEl = el("span", "fc-delay-label", t("overlay.delay.sec"));
  delayRow.append(delayMinInput, delayToEl, delayMaxInput, delaySecEl);
  delaySection.appendChild(delayRow);

  const saveRow = el("div", "fc-save-row");
  saveLinkEl = el("button", "fc-save-link");
  saveLinkEl.type = "button";
  saveLinkEl.textContent = t("overlay.delay.save");
  saveLinkEl.addEventListener("click", () => void saveDelay());
  delayStatusEl = el("span", "fc-muted fc-hidden", t("overlay.delay.saved"));
  saveRow.append(saveLinkEl, delayStatusEl);
  delaySection.appendChild(saveRow);

  // --- Task block ---
  taskSep = el("hr", "fc-divider fc-hidden");
  taskBox = el("section", "fc-section fc-hidden");
  taskHeadingEl = el("h2", "fc-heading", t("overlay.task.heading"));
  const taskCodeBox = el("div", "fc-code-box");
  taskCodeEl = el("code");
  taskCodeBox.appendChild(taskCodeEl);
  taskBox.append(taskHeadingEl, taskCodeBox);

  // --- Result block ---
  resultSep = el("hr", "fc-divider fc-hidden");
  resultBox = el("section", "fc-section fc-hidden");
  resultHeadingEl = el("h2", "fc-heading", t("overlay.result.heading"));

  const statusRow = el("div", "fc-status-row");
  statusIconEl = el("span", "fc-status-icon");
  statusIconEl.appendChild(svgIcon("0 0 24 24", "M5 13l4 4L19 7", true));
  resultStatusTextEl = el("span", "fc-status-text fc-muted", t("overlay.result.empty"));
  statusRow.append(statusIconEl, resultStatusTextEl);
  resultBox.appendChild(statusRow);

  resultTextEl = el("div", "fc-result-box", "(no output)");
  resultBox.appendChild(resultTextEl);

  // Divider between the directory and the delay sections.
  const delaySep = el("hr", "fc-divider");

  root.append(
    dirSection,
    delaySep,
    delaySection,
    taskSep,
    taskBox,
    resultSep,
    resultBox,
  );
  document.body.appendChild(root);
  panel = root;

  // --- Floating launcher shown while the panel is collapsed ---
  toggleBtn = el("button");
  toggleBtn.id = "freecode-toggle";
  toggleBtn.classList.add("fc-hidden");
  toggleBtn.textContent = "freecode";
  toggleBtn.title = t("overlay.expandTitle");
  toggleBtn.addEventListener("click", () => setCollapsed(false));
  document.body.appendChild(toggleBtn);

  // Match the page theme now and on every change.
  applyTheme();
  watchTheme();

  // When the active conversation changes: refresh the directory and clear the
  // task/result panels so nothing from the previous chat lingers.
  ipc.onProjectContextChanged(() => {
    resetTaskPanels();
    void refreshProjectDir();
  });

  void refreshProjectDir();
  void loadDelay();
}

/** Apply the saved (or browser-detected) language to the overlay. */
export async function initI18n(): Promise<void> {
  try {
    const s = await ipc.getSettings();
    setLanguage(s.language as Language);
  } catch {
    setLanguage(detectLanguage());
  }
}

export { getLanguage };
