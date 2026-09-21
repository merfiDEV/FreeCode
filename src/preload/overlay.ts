/**
 * Side overlay panel: project directory, send-delay settings, a language
 * switch, live panels for the current task and its result, and a collapse
 * button that shrinks the panel to a small floating launcher.
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
let saveLinkEl: HTMLElement | null = null;
let delayStatusEl: HTMLElement | null = null;
let taskHeadingEl: HTMLElement | null = null;
let resultHeadingEl: HTMLElement | null = null;
let resultStatusEl: HTMLElement | null = null;

let delayMinInput: HTMLInputElement | null = null;
let delayMaxInput: HTMLInputElement | null = null;

let taskBox: HTMLElement | null = null;
let taskCodeEl: HTMLElement | null = null;
let resultBox: HTMLElement | null = null;
let resultTextEl: HTMLElement | null = null;

let projectDirCache: string | null = null;
let lastResult: { ok: boolean; text: string } | null = null;

const STYLE = `
#freecode-overlay {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  color: #e6e6e6;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#freecode-overlay.fc-collapsed { display: none; }
#freecode-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #cbb8ff;
  background: rgba(30, 18, 20, 0.94);
  border: 1px solid rgba(150, 120, 255, 0.5);
  border-radius: 10px;
  padding: 8px 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
#freecode-toggle:hover { background: rgba(120, 90, 220, 0.4); }
#freecode-toggle.fc-hidden { display: none; }
.fc-card {
  background: rgba(30, 18, 20, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}
.fc-heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
  margin-bottom: 6px;
}
.fc-headrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.fc-headrow .fc-heading { margin-bottom: 0; }
.fc-headrow-actions { display: flex; align-items: center; gap: 6px; }
.fc-row { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
.fc-value {
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  color: #7ee081;
  word-break: break-all;
  margin-top: 6px;
}
#freecode-overlay button {
  cursor: pointer;
  font: inherit;
  color: #cbb8ff;
  background: rgba(120, 90, 220, 0.25);
  border: 1px solid rgba(150, 120, 255, 0.5);
  border-radius: 8px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
#freecode-overlay button:hover { background: rgba(120, 90, 220, 0.4); }
#freecode-overlay button:disabled { opacity: 0.55; cursor: default; }
.fc-icon-btn {
  padding: 3px 8px !important;
  font-size: 11px !important;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.fc-delay-box {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.fc-delay-box input {
  width: 56px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  font: inherit;
  padding: 4px 6px;
  text-align: center;
}
.fc-delay-save { text-align: right; margin-top: 6px; }
.fc-link {
  color: #b9a6ff;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
}
.fc-code {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 8px;
  margin-top: 6px;
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
  color: #d8d8d8;
}
.fc-status { margin-top: 6px; display: flex; align-items: center; gap: 6px; }
.fc-ok { color: #6ee07a; }
.fc-err { color: #ff7b7b; }
.fc-muted { opacity: 0.6; }
.fc-hidden { display: none !important; }
`;

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

function injectStyles(): void {
  if (document.getElementById("freecode-style")) return;
  const style = document.createElement("style");
  style.id = "freecode-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

// ===== Collapse / expand =====

function setCollapsed(value: boolean): void {
  panel?.classList.toggle("fc-collapsed", value);
  toggleBtn?.classList.toggle("fc-hidden", !value);
}

// ===== Language =====

/** Short badge text for the language button (shows the *target* language). */
function langBadge(): string {
  return getLanguage() === "en" ? "RU" : "EN";
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
  if (resultStatusEl) {
    if (lastResult) {
      resultStatusEl.textContent =
        (lastResult.ok ? "✅ " : "❌ ") +
        t(lastResult.ok ? "overlay.result.success" : "overlay.result.error");
      resultStatusEl.className = "fc-status " + (lastResult.ok ? "fc-ok" : "fc-err");
    } else {
      resultStatusEl.textContent = t("overlay.result.empty");
      resultStatusEl.className = "fc-status fc-muted";
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
  taskBox.classList.remove("fc-hidden");
  hideResult();
}

/** Show the result of the last execution. */
export function showResult(ok: boolean, text: string): void {
  if (!resultBox || !resultStatusEl || !resultTextEl) return;
  lastResult = { ok, text };
  resultStatusEl.textContent = (ok ? "✅ " : "❌ ") + t(ok ? "overlay.result.success" : "overlay.result.error");
  resultStatusEl.className = "fc-status " + (ok ? "fc-ok" : "fc-err");
  resultTextEl.textContent = text;
  resultBox.classList.remove("fc-hidden");
}

export function hideResult(): void {
  resultBox?.classList.add("fc-hidden");
}

/**
 * Clear the task and result panels — called when the active conversation
 * changes so stale output from a previous chat is never shown.
 */
export function resetTaskPanels(): void {
  lastResult = null;
  taskBox?.classList.add("fc-hidden");
  resultBox?.classList.add("fc-hidden");
  if (taskCodeEl) taskCodeEl.textContent = "";
  if (resultTextEl) resultTextEl.textContent = "";
  if (resultStatusEl) {
    resultStatusEl.textContent = t("overlay.result.empty");
    resultStatusEl.className = "fc-status fc-muted";
  }
}

// ===== Mount =====

/** Build the overlay panel. Idempotent — safe to call multiple times. */
export function injectOverlay(): void {
  if (panel) return;
  injectStyles();

  const root = el("div");
  root.id = "freecode-overlay";

  // --- Project card (heading row carries the language + collapse buttons) ---
  const projectCard = el("div", "fc-card");
  const projectHeadRow = el("div", "fc-headrow");
  projectHeadingEl = el("div", "fc-heading", t("overlay.project.heading"));

  const headActions = el("div", "fc-headrow-actions");
  langBtn = el("button", "fc-icon-btn", langBadge());
  langBtn.title = t("overlay.lang.switch");
  langBtn.addEventListener("click", () => void handleToggleLanguage());

  collapseBtn = el("button", "fc-icon-btn", "▾");
  collapseBtn.title = t("overlay.collapse");
  collapseBtn.addEventListener("click", () => setCollapsed(true));

  headActions.append(langBtn, collapseBtn);
  projectHeadRow.append(projectHeadingEl, headActions);
  projectCard.appendChild(projectHeadRow);

  const projectRow = el("div", "fc-row");
  changeBtn = el("button");
  changeBtn.textContent = t("overlay.project.change");
  changeBtn.addEventListener("click", () => void handleChangeProject());
  projectRow.appendChild(changeBtn);
  projectCard.appendChild(projectRow);

  projectDirEl = el("div", "fc-value", t("overlay.project.none"));
  projectCard.appendChild(projectDirEl);

  // --- Send delay card ---
  const delayCard = el("div", "fc-card");
  delayHeadingEl = el("div", "fc-heading", t("overlay.delay.heading"));
  delayCard.appendChild(delayHeadingEl);

  const delayBox = el("div", "fc-delay-box");
  delayMinInput = el("input");
  delayMinInput.type = "number";
  delayMinInput.min = "0";
  delayMinInput.step = "0.1";
  delayMaxInput = el("input");
  delayMaxInput.type = "number";
  delayMaxInput.min = "0";
  delayMaxInput.step = "0.1";
  delayToEl = el("span", "fc-muted", t("overlay.delay.to"));
  delaySecEl = el("span", "fc-muted", t("overlay.delay.sec"));
  delayBox.append(delayMinInput, delayToEl, delayMaxInput, delaySecEl);
  delayCard.appendChild(delayBox);

  const saveRow = el("div", "fc-delay-save");
  saveLinkEl = el("a", "fc-link", t("overlay.delay.save"));
  saveLinkEl.addEventListener("click", (e) => {
    e.preventDefault();
    void saveDelay();
  });
  delayStatusEl = el("span", "fc-muted fc-hidden", t("overlay.delay.saved"));
  saveRow.append(saveLinkEl, document.createTextNode(" "), delayStatusEl);
  delayCard.appendChild(saveRow);

  // --- Task card ---
  taskBox = el("div", "fc-card fc-hidden");
  taskHeadingEl = el("div", "fc-heading", t("overlay.task.heading"));
  taskCodeEl = el("div", "fc-code");
  taskBox.append(taskHeadingEl, taskCodeEl);

  // --- Result card ---
  resultBox = el("div", "fc-card fc-hidden");
  resultHeadingEl = el("div", "fc-heading", t("overlay.result.heading"));
  resultStatusEl = el("div", "fc-status fc-muted", t("overlay.result.empty"));
  resultTextEl = el("div", "fc-code");
  resultBox.append(resultHeadingEl, resultStatusEl, resultTextEl);

  root.append(projectCard, delayCard, taskBox, resultBox);
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
