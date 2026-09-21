import { getProviderByUrl } from "../providers";
import { ZAI } from "../shared/constants";
import { ipc } from "./ipc";

/**
 * Watches the z.ai session and records a successful sign-in.
 *
 * z.ai hands out a guest token to anonymous visitors, so a token in
 * localStorage is NOT proof of a real account. We treat the session as
 * authenticated only when all of the following hold:
 *   - the URL is no longer /auth,
 *   - no login form (email/password inputs) is present,
 *   - no "Sign in" / "Log in" entry point is visible,
 *   - no "Continue with <provider>" / "Skip for now" login UI is present,
 *   - a non-trivial token exists in localStorage.
 */

let marked = false;

const LOGIN_UI_RE = /^\s*(sign ?in|log ?in|войти|continue with(\s+\w+)?|skip for now)\s*$/i;

function hasLoginForm(): boolean {
  return !!document.querySelector(
    "input[type='password'], input[type='email'], input[name='password'], input[name='email']",
  );
}

function hasLoginUi(): boolean {
  return Array.from(document.querySelectorAll("button, a")).some((el) =>
    LOGIN_UI_RE.test((el.textContent || "").trim()),
  );
}

function isLoggedIn(): boolean {
  try {
    if (location.href.startsWith(ZAI.authUrl)) return false;
    if (hasLoginForm() || hasLoginUi()) return false;
    const token = localStorage.getItem("token");
    return !!token && token.length >= 20;
  } catch {
    return false;
  }
}

async function check(): Promise<void> {
  if (marked) return;
  if (!getProviderByUrl(location.href)) return;
  if (!isLoggedIn()) return;

  marked = true;
  try {
    await ipc.markLoggedIn();
    console.log("[freecode] sign-in confirmed, marker saved");
  } catch (err) {
    console.warn("[freecode] failed to save login marker:", (err as Error).message);
  }
}

/** Start polling for a completed sign-in. */
export function startLoginDetector(): void {
  setInterval(() => void check(), 1500);
  void check();
}
