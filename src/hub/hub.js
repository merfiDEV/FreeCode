/* global window, document */
/**
 * Hub renderer: lists available AI platforms, shows sign-in / project state,
 * and opens the chosen platform in its own window.
 */

const I18N = {
  ru: {
    badge: "desktop hub",
    subtitle: "Выберите платформу для работы",
    sec_title: "Подключённые платформы",
    slots: "{n} из 8 слотов",
    empty: "0 платформ",
    logged_in: "Вход выполнен",
    logged_out: "Не выполнен вход",
    project_label: "Проект:",
    last_used_label: "Последний раз:",
    no_project: "Проект не выбран",
    never: "Никогда",
    time_just: "Только что",
    time_minutes: "{n} мин назад",
    time_hours: "{n} ч назад",
    time_days: "{n} дн назад",
    btn_open: "Открыть",
    btn_login: "Войти",
    data_in: "данные в",
    check_updates: "Проверить обновления",
    modal_settings_title: "Настройки freecode",
    modal_lang_label: "Язык интерфейса",
    modal_delay_label: "Задержка отправки команд в чат",
    modal_path_label: "Путь к папке данных и проектов",
    modal_open_folder: "Открыть папку",
    modal_save_btn: "Готово",
    delay_to: "до",
    delay_sec: "сек",
    toast_opening: "Открываю {name}…",
    toast_saved: "Сохранено",
    toast_latest: "У вас последняя версия {v}",
    toast_update: "Доступна версия {v}",
  },
  en: {
    badge: "desktop hub",
    subtitle: "Select an AI platform to start",
    sec_title: "Connected Platforms",
    slots: "{n} of 8 slots",
    empty: "0 platforms",
    logged_in: "Logged in",
    logged_out: "Not logged in",
    project_label: "Project:",
    last_used_label: "Last active:",
    no_project: "No project selected",
    never: "Never",
    time_just: "Just now",
    time_minutes: "{n} min ago",
    time_hours: "{n} h ago",
    time_days: "{n} d ago",
    btn_open: "Open",
    btn_login: "Sign In",
    data_in: "data in",
    check_updates: "Check for updates",
    modal_settings_title: "freecode Settings",
    modal_lang_label: "Interface Language",
    modal_delay_label: "Chat command input delay",
    modal_path_label: "Data & workspace directory",
    modal_open_folder: "Open folder",
    modal_save_btn: "Done",
    delay_to: "to",
    delay_sec: "sec",
    toast_opening: "Opening {name}…",
    toast_saved: "Saved",
    toast_latest: "You have the latest version {v}",
    toast_update: "Version {v} is available",
  },
};

let lang = "en";
let providers = [];
let info = null;

function t(key, vars) {
  let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split("{" + k + "}").join(String(v));
    }
  }
  return text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function relativeTime(ts) {
  if (!ts) return t("never");
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("time_just");
  if (min < 60) return t("time_minutes", { n: min });
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t("time_hours", { n: hrs });
  const days = Math.floor(hrs / 24);
  return t("time_days", { n: days });
}

function shortenPath(p) {
  if (!p) return "";
  if (p.length <= 28) return p;
  const parts = p.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 2) return p;
  return parts[0] + "\\…\\" + parts[parts.length - 1];
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toastText").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function applyTranslations() {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    const text = t(key);
    if (text) node.textContent = text;
  }
}

function renderProviders() {
  const container = document.getElementById("cards");
  const counter = document.getElementById("secCount");
  container.innerHTML = "";
  counter.textContent = providers.length ? t("slots", { n: providers.length }) : t("empty");

  for (const p of providers) {
    const card = el("div", "platform-card");

    const top = el("div");
    const head = el("div", "card-head");
    const badge = el("div", "platform-logo-badge");
    const logo = el("img");
    logo.src = "logos/" + p.id + ".png";
    logo.alt = p.name;
    logo.draggable = false;
    logo.addEventListener("error", () => {
      // Fallback: keep the plate empty if the logo is missing.
      logo.remove();
    });
    badge.appendChild(logo);
    const status = el("div", "status-pill " + (p.loggedIn ? "status-logged-in" : "status-logged-out"));
    status.appendChild(el("span", "status-dot"));
    status.appendChild(el("span", undefined, p.loggedIn ? t("logged_in") : t("logged_out")));
    head.append(badge, status);

    const identity = el("div", "card-identity");
    identity.appendChild(el("h3", "platform-name", p.name));
    identity.appendChild(el("span", "platform-domain", p.host));

    const meta = el("div", "card-meta-list");
    const rowProject = el("div", "meta-row");
    rowProject.appendChild(el("span", "meta-label", t("project_label")));
    const pathEl = el("span", "meta-value-path" + (p.projectDir ? "" : " empty"),
      p.projectDir ? shortenPath(p.projectDir) : t("no_project"));
    if (p.projectDir) pathEl.title = p.projectDir;
    rowProject.appendChild(pathEl);
    meta.appendChild(rowProject);

    const rowTime = el("div", "meta-row");
    rowTime.appendChild(el("span", "meta-label", t("last_used_label")));
    rowTime.appendChild(el("span", "meta-value-time", relativeTime(p.lastUsedAt)));
    meta.appendChild(rowTime);

    top.append(head, identity, meta);
    card.appendChild(top);

    const btn = el("button", "card-action-btn " + (p.loggedIn ? "btn-open" : "btn-login"));
    btn.appendChild(el("span", undefined, p.loggedIn ? t("btn_open") : t("btn_login")));
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>';
    btn.appendChild(arrow);
    btn.addEventListener("click", () => void openProvider(p));
    card.appendChild(btn);

    container.appendChild(card);
  }
}

async function openProvider(p) {
  showToast(t("toast_opening", { name: p.name }));
  try {
    const res = await window.hubAPI.openProvider(p.id);
    if (!res.ok) showToast(res.error || "Error");
  } catch (err) {
    showToast(String(err));
  }
}

async function loadProviders() {
  try {
    providers = await window.hubAPI.listProviders();
  } catch {
    providers = [];
  }
  renderProviders();
}

async function loadInfo() {
  try {
    info = await window.hubAPI.getInfo();
  } catch {
    info = null;
  }
  if (!info) return;
  document.getElementById("txtVersion").textContent = "v" + info.version;
  document.getElementById("inpDataRoot").value = info.dataRoot;
  document.getElementById("lnkDataRoot").textContent = info.dataRoot;
  document.getElementById("inpDelayMin").value = String(info.sendDelayMin);
  document.getElementById("inpDelayMax").value = String(info.sendDelayMax);
  setLang(info.language, false);
}

function setLang(next, persist) {
  lang = next === "ru" ? "ru" : "en";
  document.documentElement.lang = lang;
  document.getElementById("btnLangRU").classList.toggle("active", lang === "ru");
  document.getElementById("btnLangEN").classList.toggle("active", lang === "en");
  const mRu = document.getElementById("mBtnLangRU");
  const mEn = document.getElementById("mBtnLangEN");
  if (mRu) mRu.classList.toggle("active", lang === "ru");
  if (mEn) mEn.classList.toggle("active", lang === "en");
  applyTranslations();
  renderProviders();
  if (persist && window.hubAPI) void window.hubAPI.setLanguage(lang);
}

function openSettings(show) {
  document.getElementById("settingsModal").classList.toggle("open", show);
}

function wireEvents() {
  document.getElementById("btnLangRU").addEventListener("click", () => setLang("ru", true));
  document.getElementById("btnLangEN").addEventListener("click", () => setLang("en", true));
  document.getElementById("mBtnLangRU").addEventListener("click", () => setLang("ru", true));
  document.getElementById("mBtnLangEN").addEventListener("click", () => setLang("en", true));

  document.getElementById("btnSettings").addEventListener("click", () => openSettings(true));
  document.getElementById("btnCloseSettings").addEventListener("click", () => openSettings(false));
  document.getElementById("btnDoneSettings").addEventListener("click", () => openSettings(false));
  document.getElementById("settingsModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) openSettings(false);
  });

  document.getElementById("btnSaveDelay").addEventListener("click", async () => {
    const min = Number(document.getElementById("inpDelayMin").value) || 0;
    const max = Number(document.getElementById("inpDelayMax").value) || 0;
    await window.hubAPI.setSendDelay(min, max);
    showToast(t("toast_saved"));
  });

  document.getElementById("btnOpenFolder").addEventListener("click", () => {
    void window.hubAPI.openDataFolder();
  });

  document.getElementById("btnUpdates").addEventListener("click", async () => {
    const res = await window.hubAPI.checkUpdates();
    showToast(res.upToDate ? t("toast_latest", { v: res.current }) : t("toast_update", { v: res.latest }));
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openSettings(false);
  });

  if (window.hubAPI && window.hubAPI.onRefresh) {
    window.hubAPI.onRefresh(() => void loadProviders());
  }
}

async function boot() {
  wireEvents();
  await loadInfo();
  await loadProviders();
}

document.addEventListener("DOMContentLoaded", () => void boot());
