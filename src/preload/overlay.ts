/**
 * Side overlay panel styled after Material Design 3 (dark).
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
let resultStatusEl: HTMLElement | null = null;
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
  color: #E6E1E5;
  background: #1C1924;
  border: 1px solid rgba(56, 52, 68, 0.5);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-font-smoothing: antialiased;
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
  color: #E6E1E5;
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
  background: #38304D;
  color: #E8DEF8;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(56, 52, 68, 0.6);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
#freecode-overlay .fc-chip:hover { background: #363244; }

#freecode-overlay .fc-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #38304D;
  color: #E8DEF8;
  border: 1px solid rgba(56, 52, 68, 0.6);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}
#freecode-overlay .fc-icon-btn:hover { background: #363244; }
#freecode-overlay .fc-icon-btn svg { width: 14px; height: 14px; fill: currentColor; }

#freecode-overlay .fc-change-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 13px;
  border-radius: 10px;
  background: #38304D;
  color: #d6cded;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(56, 52, 68, 0.4);
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: background 0.15s, transform 0.1s;
}
#freecode-overlay .fc-change-btn:hover { background: #363244; }
#freecode-overlay .fc-change-btn:active { transform: scale(0.98); }
#freecode-overlay .fc-change-btn:disabled { opacity: 0.55; cursor: default; }

#freecode-overlay .fc-path {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  font-weight: 500;
  color: #7CE38B;
  word-break: break-all;
  user-select: text;
  letter-spacing: -0.01em;
}

#freecode-overlay .fc-divider {
  border: none;
  border-top: 1px solid rgba(56, 52, 68, 0.4);
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
  background: #15121c;
  border: 1px solid rgba(56, 52, 68, 0.8);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #E6E1E5;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#freecode-overlay .fc-delay-row input:focus {
  border-color: #D0BCFF;
  box-shadow: 0 0 0 1px #D0BCFF;
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
  color: #CAC4D0;
}

#freecode-overlay .fc-save-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
#freecode-overlay .fc-save-link {
  font-size: 12px;
  font-weight: 500;
  color: #D0BCFF;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;
  transition: color 0.15s, background 0.15s;
}
#freecode-overlay .fc-save-link:hover {
  color: #EADDFF;
  background: rgba(208, 188, 255, 0.08);
}

#freecode-overlay .fc-code-box {
  background: #121017;
  border: 1px solid rgba(56, 52, 68, 0.4);
  border-radius: 10px;
  padding: 9px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 10px;
  line-height: 1.55;
  color: #d1d5db;
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
  background: #137333;
  color: #fff;
  flex-shrink: 0;
}
#freecode-overlay .fc-status-icon.fc-err-bg { background: #b3261e; }
#freecode-overlay .fc-status-icon svg {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}
#freecode-overlay .fc-status-text {
  font-size: 12px;
  font-weight: 500;
  color: #7CE38B;
}
#freecode-overlay .fc-status-text.fc-err { color: #ff7b7b; }

#freecode-overlay .fc-muted { opacity: 0.6; }
#freecode-overlay .fc-hidden { display: none !important; }

#freecode-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  cursor: pointer;
  font-family: 'Roboto', 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #EADDFF;
  background: #1C1924;
  border: 1px solid rgba(208, 188, 255, 0.4);
  border-radius: 24px;
  padding: 10px 16px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
#freecode-toggle:hover { background: #23202E; }
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
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Roboto:wght@400;500;700&display=swap";
  document.head.append(pre1, pre2, link);
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
  if (resultTextEl) resultTextEl.textContent = "";
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

  const resultCodeBox = el("div", "fc-code-box", "(no output)");
  resultTextEl = resultCodeBox;
  resultBox.appendChild(resultCodeBox);

  // Divider after the directory, before the delay section.
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
