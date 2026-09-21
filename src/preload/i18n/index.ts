import { en, type TranslationKey } from "./en";
import { ru } from "./ru";

export type { TranslationKey };

export type Language = "en" | "ru";

const DICTS: Record<Language, Record<TranslationKey, string>> = { en, ru };

let current: Language = "en";

/** Pick a default language from the browser locale. */
export function detectLanguage(): Language {
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return nav && nav.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function setLanguage(lang: Language): void {
  current = DICTS[lang] ? lang : "en";
}

export function getLanguage(): Language {
  return current;
}

/** Translate a key, with optional {placeholder} interpolation. */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let text = DICTS[current][key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split("{" + k + "}").join(String(v));
    }
  }
  return text;
}
