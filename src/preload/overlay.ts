/**
 * Side overlay panel styled after Material Design 3 (mint / seafoam).
 * Adopts a dark palette automatically when the host page is in dark mode.
 * Shows the project directory, send-delay settings, a language switch, a
 * collapse button, and live panels for the current task and its result.
 */
import { sendMessage } from "./chat-input";
import { ipc } from "./ipc";
import { iconDataUri } from "./icon";
import { getProviderByUrl } from "../providers";
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

let providerHeadingEl: HTMLElement | null = null;
let providerSelect: HTMLSelectElement | null = null;

// MCP
let mcpHeadingEl: HTMLElement | null = null;
let mcpAddBtn: HTMLButtonElement | null = null;
let mcpListEl: HTMLElement | null = null;
let mcpModal: HTMLElement | null = null;
let mcpTitleEl: HTMLElement | null = null;
let mcpModalListEl: HTMLElement | null = null;
let mcpJsonEl: HTMLTextAreaElement | null = null;
let mcpSaveBtn: HTMLButtonElement | null = null;
let mcpCloseBtn: HTMLButtonElement | null = null;
let mcpConfiguredLabel: HTMLElement | null = null;

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

#freecode-overlay .fc-provider-select {
  width: 100%;
  background: var(--fc-input-bg);
  border: 1px solid var(--fc-input-border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-input-text);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
#freecode-overlay .fc-provider-select:focus {
  border-color: var(--fc-input-focus);
  box-shadow: 0 0 0 1px var(--fc-input-focus);
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

#freecode-overlay .fc-mcp-list {
  display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;
}
#freecode-overlay .fc-mcp-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 5px 9px; border-radius: 8px;
  background: var(--fc-input-bg); border: 1px solid var(--fc-border);
  font-size: 12px;
}
#freecode-overlay .fc-mcp-name {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  color: var(--fc-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#freecode-overlay .fc-mcp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
#freecode-overlay .fc-mcp-empty { font-size: 11px; font-style: italic; color: var(--fc-muted-text); }
#freecode-overlay .fc-mcp-headrow {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;
}
#freecode-overlay .fc-link-btn {
  background: none; border: none; color: var(--fc-link); cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; padding: 2px 6px; border-radius: 6px;
}
#freecode-overlay .fc-link-btn:hover { background: rgba(77, 174, 132, 0.12); color: var(--fc-link-hover); }

/* MCP modal */
#freecode-mcp-modal {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(4, 15, 10, 0.75);
  display: flex; align-items: center; justify-content: center;
}
#freecode-mcp-modal.fc-hidden { display: none !important; }
.fc-mcp-box {
  width: 680px; max-width: 92vw; max-height: 86vh;
  background: var(--fc-panel-bg); border: 1px solid var(--fc-border-bright);
  border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px;
  font-family: 'Roboto', 'Inter', system-ui, sans-serif; font-size: 13px;
  color: var(--fc-text); box-shadow: 0 30px 60px -15px rgba(0,0,0,0.8);
}
.fc-mcp-box.fc-dark {
  --fc-panel-bg: #0e2018; --fc-border: #234a3b; --fc-border-bright: #2f5c49;
  --fc-text: #cfe9dc; --fc-heading: #d7f5e7; --fc-muted-text: #8dbfa9;
  --fc-input-bg: #10281f; --fc-input-border: #2c5a48; --fc-input-text: #e6fff4;
  --fc-code-bg: #0a1a13; --fc-code-text: #98f4cc; --fc-link: #7fe3b3; --fc-link-hover: #a8f5d0;
  --fc-btn-bg: #1f5c44; --fc-btn-border: #2c7357; --fc-btn-hover: #27694e; --fc-btn-text: #e6fff4;
}
.fc-mcp-header { display: flex; align-items: center; justify-content: space-between; }
.fc-mcp-title { font-size: 16px; font-weight: 700; color: var(--fc-heading); }
.fc-mcp-body { display: flex; gap: 14px; flex: 1; min-height: 0; }
.fc-mcp-left { width: 200px; flex-shrink: 0; display: flex; flex-direction: column; }
.fc-mcp-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--fc-muted-text); margin-bottom: 6px;
}
.fc-mcp-servers { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.fc-mcp-right { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.fc-mcp-json {
  flex: 1; min-height: 300px; resize: vertical;
  background: var(--fc-code-bg); border: 1px solid var(--fc-input-border);
  border-radius: 10px; padding: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 11px; line-height: 1.5; color: var(--fc-code-text);
  outline: none; white-space: pre; overflow: auto;
}
.fc-mcp-actions { display: flex; justify-content: flex-end; gap: 8px; }
.fc-mcp-btn {
  height: 34px; padding: 0 16px; border-radius: 10px; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 600;
  border: 1px solid var(--fc-btn-border); background: var(--fc-btn-bg); color: var(--fc-btn-text);
}
.fc-mcp-btn:hover { background: var(--fc-btn-hover); }
.fc-mcp-btn.secondary {
  background: transparent; border-color: var(--fc-border-bright); color: var(--fc-text);
}
.fc-mcp-btn.secondary:hover { border-color: var(--fc-link); color: var(--fc-link); }

#freecode-overlay .fc-muted { opacity: 0.6; }
#freecode-overlay .fc-hidden { display: none !important; }

#freecode-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
  cursor: pointer;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: transparent;
  box-shadow: 0 10px 20px -6px rgba(16, 56, 43, 0.45);
  transition: transform 0.15s, box-shadow 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
#freecode-toggle:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 14px 24px -6px rgba(16, 56, 43, 0.5);
}
#freecode-toggle:active { transform: scale(0.97); }
#freecode-toggle img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  user-select: none;
}
/* Fallback when the icon asset is unavailable. */
#freecode-toggle.fc-fallback {
  background: #1c4a38;
  color: #98f4cc;
  font-family: 'Roboto', 'Inter', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
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

/** True when the host page is in dark mode — decided by the active provider. */
function isDarkPage(): boolean {
  const provider = getProviderByUrl(location.href);
  if (provider) return provider.isDarkMode();
  const html = document.documentElement;
  return html.classList.contains("dark") || html.getAttribute("data-theme") === "dark";
}

/** Mirror the page theme onto the overlay panel. */
function applyTheme(): void {
  panel?.classList.toggle("fc-dark", isDarkPage());
  applyThemeToModal();
}

/** Keep the overlay theme in sync with the page. */
function watchTheme(): void {
  const observer = new MutationObserver(() => applyTheme());
  const opts: MutationObserverInit = {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-color-scheme", "data-ds-dark-theme"],
  };
  // Some sites set the theme on <html>, others on <body> (DeepSeek) — watch both.
  observer.observe(document.documentElement, opts);
  if (document.body) observer.observe(document.body, opts);
  else document.addEventListener("DOMContentLoaded", () => observer.observe(document.body, opts), { once: true });
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
  if (providerHeadingEl) providerHeadingEl.textContent = t("overlay.provider.heading");
  if (mcpHeadingEl) mcpHeadingEl.textContent = t("overlay.mcp.heading");
  if (mcpAddBtn) mcpAddBtn.textContent = t("overlay.mcp.add");
  if (mcpTitleEl) mcpTitleEl.textContent = t("overlay.mcp.title");
  if (mcpConfiguredLabel) mcpConfiguredLabel.textContent = t("overlay.mcp.configured");
  if (mcpSaveBtn) mcpSaveBtn.textContent = t("overlay.mcp.save");
  if (mcpCloseBtn) mcpCloseBtn.textContent = t("overlay.mcp.close");
  if (mcpJsonEl && !mcpJsonEl.value.trim()) mcpJsonEl.placeholder = t("overlay.mcp.placeholder");
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
  if (toggleBtn) {
    toggleBtn.title = t("overlay.expandTitle");
    toggleBtn.setAttribute("aria-label", t("overlay.expandTitle"));
  }

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

// ===== Provider =====

async function loadProviders(): Promise<void> {
  if (!providerSelect) return;
  try {
    const providers = await ipc.listProviders();
    const active = getProviderByUrl(location.href);
    providerSelect.innerHTML = "";
    for (const p of providers) {
      const opt = el("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (active && p.id === active.id) opt.selected = true;
      providerSelect.appendChild(opt);
    }
  } catch (err) {
    console.error("[freecode] failed to load providers:", err);
  }
}

async function handleSwitchProvider(): Promise<void> {
  if (!providerSelect) return;
  const target = providerSelect.value;
  const active = getProviderByUrl(location.href);
  if (active && target === active.id) return;
  try {
    await ipc.switchProvider(target);
  } catch (err) {
    console.error("[freecode] failed to switch provider:", err);
  }
}

// ===== MCP =====

interface McpServerStatus {
  name: string;
  type: string;
  enabled: boolean;
  connected: boolean;
  toolCount: number;
}

function mcpStatusLabel(s: McpServerStatus): string {
  if (!s.enabled) return t("overlay.mcp.status.disabled");
  return s.connected ? t("overlay.mcp.status.connected") : t("overlay.mcp.status.pending");
}

function mcpStatusColor(s: McpServerStatus): string {
  if (!s.enabled) return "#6a9a86";
  return s.connected ? "#4ade80" : "#e6be44";
}

function showToast(text: string): void {
  const toast = document.getElementById("freecode-toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("fc-hidden");
  setTimeout(() => toast?.classList.add("fc-hidden"), 2500);
}

/** Render the compact server list shown in the panel. */
async function renderMcpList(): Promise<void> {
  if (!mcpListEl) return;
  try {
    const res = await ipc.listMcpServers();
    const servers = res.servers ?? [];
    mcpListEl.innerHTML = "";
    if (servers.length === 0) {
      mcpListEl.appendChild(el("div", "fc-mcp-empty", t("overlay.mcp.empty")));
      return;
    }
    for (const s of servers) {
      const item = el("div", "fc-mcp-item");
      item.appendChild(el("span", "fc-mcp-name", s.name));
      const dot = el("span", "fc-mcp-dot");
      dot.style.background = mcpStatusColor(s);
      dot.title = mcpStatusLabel(s);
      item.appendChild(dot);
      item.addEventListener("click", () => void toggleMcpServer(s));
      mcpListEl.appendChild(item);
    }
  } catch {
    mcpListEl.innerHTML = "";
    mcpListEl.appendChild(el("div", "fc-mcp-empty", "Error"));
  }
}

/**
 * Enable/disable a server by clicking its row.
 *
 * The primary signal is `connected`, not `enabled`: a freshly added server is
 * enabled by default but has not been dialled yet, so the first click must
 * connect it rather than switch it off.
 */
async function toggleMcpServer(s: McpServerStatus): Promise<void> {
  try {
    if (s.connected) {
      await ipc.disableMcpServer(s.name);
      showToast(s.name + " — " + t("overlay.mcp.status.disabled"));
    } else {
      showToast(t("overlay.mcp.connecting", { name: s.name }));
      const r = await ipc.enableMcpServer(s.name);
      if (!r.success) {
        showToast(t("overlay.mcp.serverError", { name: s.name, msg: r.error ?? "" }));
      } else {
        const after = await ipc.listMcpServers();
        const fresh = (after.servers ?? []).find((x) => x.name === s.name);
        showToast(t("overlay.mcp.connected", { name: s.name, n: fresh?.toolCount ?? 0 }));
      }
    }
  } catch (err) {
    showToast(String(err));
  }
  await renderMcpList();
  if (mcpModal && !mcpModal.classList.contains("fc-hidden")) {
    await renderMcpModalList();
    await loadMcpConfigToJson();
  }
}

/** Render the server list inside the modal (same data, larger rows). */
async function renderMcpModalList(): Promise<void> {
  if (!mcpModalListEl) return;
  try {
    const res = await ipc.listMcpServers();
    const servers = res.servers ?? [];
    mcpModalListEl.innerHTML = "";
    if (servers.length === 0) {
      mcpModalListEl.appendChild(el("div", "fc-mcp-empty", t("overlay.mcp.empty")));
      return;
    }
    for (const s of servers) {
      const item = el("div", "fc-mcp-item");
      item.appendChild(el("span", "fc-mcp-name", s.name));
      const dot = el("span", "fc-mcp-dot");
      dot.style.background = mcpStatusColor(s);
      dot.title = mcpStatusLabel(s);
      item.appendChild(dot);
      item.addEventListener("click", () => void toggleMcpServer(s));
      mcpModalListEl.appendChild(item);
    }
  } catch {
    /* ignore */
  }
}

/** Load the current config into the modal's JSON editor. */
async function loadMcpConfigToJson(): Promise<void> {
  if (!mcpJsonEl) return;
  try {
    const res = await ipc.listMcpServers();
    const servers = res.config ?? [];
    const mcpServers: Record<string, unknown> = {};
    for (const s of servers) {
      const def: Record<string, unknown> = {};
      if (s.type === "http") {
        if (s.url) def.url = s.url;
        if (s.headers) def.headers = s.headers;
      } else {
        if (s.command) def.command = s.command;
        if (s.args && s.args.length) def.args = s.args;
        if (s.env) def.env = s.env;
      }
      mcpServers[s.name] = def;
    }
    mcpJsonEl.value = JSON.stringify({ mcpServers }, null, 2);
  } catch {
    /* keep current text */
  }
}

/** Validate and persist the JSON editor contents. */
async function saveMcpConfig(): Promise<void> {
  if (!mcpJsonEl) return;
  const raw = mcpJsonEl.value.trim();
  if (!raw) return;

  let parsed: { mcpServers?: Record<string, Record<string, unknown>> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    showToast(t("overlay.mcp.invalidJson"));
    return;
  }
  if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
    showToast(t("overlay.mcp.needServers"));
    return;
  }

  // Validate every server before touching the stored config.
  for (const [name, def] of Object.entries(parsed.mcpServers)) {
    if (!def || typeof def !== "object" || Array.isArray(def)) {
      showToast(t("overlay.mcp.serverError", { name, msg: "definition must be an object" }));
      return;
    }
    const hasUrl = def.url !== undefined;
    const hasCommand = def.command !== undefined;
    if (hasUrl && hasCommand) {
      showToast(t("overlay.mcp.serverError", { name, msg: "cannot set both url and command" }));
      return;
    }
    if (!hasUrl && !hasCommand) {
      showToast(t("overlay.mcp.serverError", { name, msg: "missing command or url" }));
      return;
    }
    if (def.args !== undefined && !Array.isArray(def.args)) {
      showToast(t("overlay.mcp.serverError", { name, msg: "args must be an array" }));
      return;
    }
  }

  // Remove servers that are gone, then upsert the rest.
  const existing = await ipc.listMcpServers();
  const newNames = new Set(Object.keys(parsed.mcpServers));
  for (const s of existing.servers ?? []) {
    if (!newNames.has(s.name)) await ipc.removeMcpServer(s.name);
  }
  for (const [name, def] of Object.entries(parsed.mcpServers)) {
    await ipc.upsertMcpServer({
      name,
      type: def.url ? "http" : "stdio",
      command: def.command as string | undefined,
      args: (def.args as string[]) || [],
      url: def.url as string | undefined,
      headers: def.headers as Record<string, string> | undefined,
      env: def.env as Record<string, string> | undefined,
    });
  }

  showToast(t("overlay.mcp.saved"));

  // Bring the just-saved servers online so their tools are available without
  // an extra click.
  try {
    await ipc.connectEnabledMcpServers();
  } catch (err) {
    console.warn("[freecode][mcp] auto-connect failed:", (err as Error).message);
  }

  await renderMcpList();
  await renderMcpModalList();
  await loadMcpConfigToJson();
}

function openMcpModal(): void {
  if (!mcpModal) return;
  mcpModal.classList.remove("fc-hidden");
  applyThemeToModal();
  void renderMcpModalList();
  void loadMcpConfigToJson();
}

function closeMcpModal(): void {
  mcpModal?.classList.add("fc-hidden");
}

function applyThemeToModal(): void {
  const dark = isDarkPage();
  mcpModal?.querySelector(".fc-mcp-box")?.classList.toggle("fc-dark", dark);
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

  // --- Provider section ---
  const providerSection = el("section", "fc-section");
  providerHeadingEl = el("h2", "fc-heading", t("overlay.provider.heading"));
  providerSelect = el("select", "fc-provider-select");
  providerSelect.addEventListener("change", () => void handleSwitchProvider());
  providerSection.append(providerHeadingEl, providerSelect);
  const providerSep = el("hr", "fc-divider");

  // --- MCP section ---
  const mcpSection = el("section", "fc-section");
  const mcpHeadRow = el("div", "fc-mcp-headrow");
  mcpHeadingEl = el("h2", "fc-heading", t("overlay.mcp.heading"));
  mcpAddBtn = el("button", "fc-link-btn", t("overlay.mcp.add"));
  mcpAddBtn.type = "button";
  mcpAddBtn.addEventListener("click", () => openMcpModal());
  mcpHeadRow.append(mcpHeadingEl, mcpAddBtn);
  mcpSection.appendChild(mcpHeadRow);
  mcpListEl = el("div", "fc-mcp-list");
  mcpSection.appendChild(mcpListEl);
  const mcpSep = el("hr", "fc-divider");

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
    providerSection,
    providerSep,
    mcpSection,
    mcpSep,
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
  toggleBtn.title = t("overlay.expandTitle");
  toggleBtn.setAttribute("aria-label", t("overlay.expandTitle"));

  const iconUri = iconDataUri();
  if (iconUri) {
    const img = el("img");
    img.src = iconUri;
    img.alt = "freecode";
    img.draggable = false;
    toggleBtn.appendChild(img);
  } else {
    toggleBtn.classList.add("fc-fallback");
    toggleBtn.textContent = "fc";
  }

  toggleBtn.addEventListener("click", () => setCollapsed(false));
  document.body.appendChild(toggleBtn);

  // --- MCP modal ---
  mcpModal = el("div");
  mcpModal.id = "freecode-mcp-modal";
  mcpModal.classList.add("fc-hidden");
  mcpModal.addEventListener("click", (e) => {
    if (e.target === mcpModal) closeMcpModal();
  });

  const mcpBox = el("div", "fc-mcp-box");
  const mcpHeader = el("div", "fc-mcp-header");
  mcpTitleEl = el("div", "fc-mcp-title", t("overlay.mcp.title"));
  mcpCloseBtn = el("button", "fc-link-btn", t("overlay.mcp.close"));
  mcpCloseBtn.type = "button";
  mcpCloseBtn.addEventListener("click", () => closeMcpModal());
  mcpHeader.append(mcpTitleEl, mcpCloseBtn);

  const mcpBody = el("div", "fc-mcp-body");
  const mcpLeft = el("div", "fc-mcp-left");
  mcpConfiguredLabel = el("div", "fc-mcp-label", t("overlay.mcp.configured"));
  mcpModalListEl = el("div", "fc-mcp-servers");
  mcpLeft.append(mcpConfiguredLabel, mcpModalListEl);

  const mcpRight = el("div", "fc-mcp-right");
  mcpJsonEl = el("textarea", "fc-mcp-json");
  mcpJsonEl.placeholder = t("overlay.mcp.placeholder");
  mcpJsonEl.spellcheck = false;
  const mcpActions = el("div", "fc-mcp-actions");
  mcpSaveBtn = el("button", "fc-mcp-btn", t("overlay.mcp.save"));
  mcpSaveBtn.type = "button";
  mcpSaveBtn.addEventListener("click", () => void saveMcpConfig());
  mcpActions.appendChild(mcpSaveBtn);
  mcpRight.append(mcpJsonEl, mcpActions);

  mcpBody.append(mcpLeft, mcpRight);
  mcpBox.append(mcpHeader, mcpBody);
  mcpModal.appendChild(mcpBox);
  document.body.appendChild(mcpModal);

  // --- Toast ---
  const toast = el("div");
  toast.id = "freecode-toast";
  toast.className = "fc-hidden";
  toast.style.cssText =
    "position:fixed;bottom:16px;left:16px;z-index:2147483647;max-width:320px;" +
    "background:rgba(16,107,71,0.95);color:#e6fff4;padding:8px 14px;" +
    "border-radius:12px;font-size:12px;font-weight:500;line-height:1.4;" +
    "box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:'Roboto',system-ui,sans-serif;";
  document.body.appendChild(toast);

  // Match the page theme now and on every change.
  applyTheme();
  watchTheme();

  // When the active conversation changes: refresh the directory and clear the
  // task/result panels so nothing from the previous chat lingers.
  ipc.onProjectContextChanged(() => {
    resetTaskPanels();
    void refreshProjectDir();
    void renderMcpList();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMcpModal();
  });

  void loadProviders();
  void renderMcpList();
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
