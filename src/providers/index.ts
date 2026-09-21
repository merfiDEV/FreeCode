import type { Provider } from "../shared/types";
import { zaiProvider } from "./zai";

const builtins: Provider[] = [zaiProvider];

export function getAllProviders(): Provider[] {
  return [...builtins];
}

export function getProvider(id: string): Provider | null {
  return getAllProviders().find((p) => p.id === id) ?? null;
}

export function getProviderByUrl(url: string): Provider | null {
  return getAllProviders().find((p) => p.matchesUrl(url)) ?? null;
}
