import type { Provider } from "../shared/types";
import { zaiProvider } from "./zai";
import { deepseekProvider } from "./deepseek";
import { qwenProvider } from "./qwen";

/** All built-in providers, in the order shown to the user. */
const builtins: Provider[] = [zaiProvider, deepseekProvider, qwenProvider];

export function getAllProviders(): Provider[] {
  return [...builtins];
}

export function getProvider(id: string | null | undefined): Provider | null {
  if (!id) return null;
  return getAllProviders().find((p) => p.id === id) ?? null;
}

/** Provider that owns the given page URL, or null. */
export function getProviderByUrl(url: string): Provider | null {
  return getAllProviders().find((p) => p.matchesUrl(url)) ?? null;
}

/** The provider the app should open by default. */
export function getDefaultProvider(): Provider {
  return builtins[0];
}
