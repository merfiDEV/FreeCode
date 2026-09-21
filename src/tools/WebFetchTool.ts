import type { ToolDefinition } from "./types";
import { ok, fail } from "./types";
import TurndownService from "turndown";
// GFM plugin ships as CommonJS without bundled types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { gfm } from "@joplin/turndown-plugin-gfm";

/**
 * webFetch — download an HTTP(S) URL and return its text.
 *
 * HTML is converted to Markdown (turndown + GFM tables/strikethrough) so the
 * model receives readable content instead of raw tags. Downloads are capped
 * in both bytes and characters to keep the model's context small.
 */

/** Timeout for a single request. */
const FETCH_TIMEOUT_MS = 15_000;
/** Hard cap on the returned text. */
const FETCH_MAX_OUTPUT_CHARS = 20_000;
/** Hard cap on the number of bytes read from the wire. */
const MAX_BYTES = 512_000;

/** HTML → Markdown, aligned with the original Cookie Code tool. */
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndown.use(gfm);
turndown.remove(["script", "style", "noscript"]);

type BodyKind = "html" | "text";

/** Convert the downloaded body into plain text or Markdown. */
function renderBody(kind: BodyKind, content: string): { text: string; sourceTruncated: boolean } {
  const sliced = content.slice(0, FETCH_MAX_OUTPUT_CHARS);
  const sourceTruncated = sliced.length !== content.length;
  if (kind === "html") {
    try {
      return { text: turndown.turndown(sliced), sourceTruncated };
    } catch {
      // Conversion failed — fall back to raw HTML.
      return { text: sliced, sourceTruncated };
    }
  }
  return { text: sliced, sourceTruncated };
}

/** Compose "Fetched <url> (HTTP <status>)" + body, with a truncation footer. */
function formatFetchOutput(
  url: string,
  statusCode: number,
  kind: BodyKind,
  body: string,
  truncated: boolean,
): string {
  const rendered = renderBody(kind, body);
  const effectiveTruncated =
    truncated || rendered.sourceTruncated || rendered.text.length > FETCH_MAX_OUTPUT_CHARS;
  const header = "Fetched " + url + " (HTTP " + statusCode + ")\n\n";
  const footer = effectiveTruncated
    ? "\n\n(Content truncated. Fetch a more specific URL or section for the full text.)"
    : "";
  let full = header + rendered.text + footer;
  if (full.length > FETCH_MAX_OUTPUT_CHARS) {
    full = full.slice(0, FETCH_MAX_OUTPUT_CHARS) + footer;
  }
  return full;
}

/** Read the response body, stopping once MAX_BYTES have arrived. */
async function readCapped(
  response: Response,
): Promise<{ buffer: Buffer; truncated: boolean }> {
  if (!response.body) return { buffer: Buffer.alloc(0), truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > MAX_BYTES) {
      const remaining = MAX_BYTES - (received - value.byteLength);
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    chunks.push(value);
  }

  return { buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))), truncated };
}

interface WebFetchParams {
  url: string;
}

export const WebFetchTool: ToolDefinition<WebFetchParams> = {
  name: "webFetch",
  signature: "webFetch(url)",
  description:
    "Fetch an HTTP(S) URL and return its content as text (HTML is converted to Markdown). " +
    "Output is truncated at ~20000 characters with a footer.",
  risky: true,
  mapArgs: (a) => ({ url: a[0] as string }),
  async execute(params) {
    const rawUrl = typeof params.url === "string" ? params.url.trim() : "";
    if (!rawUrl) return fail("url must be a non-empty string");

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return fail("Invalid URL: " + rawUrl);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fail("Only http/https URLs are supported");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(parsed.toString(), {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          // Some sites serve a degraded page without a browser-like UA.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const { buffer, truncated } = await readCapped(response);
      clearTimeout(timeoutId);

      const text = buffer.toString("utf-8");
      const contentType = response.headers.get("content-type") ?? "";
      const kind: BodyKind =
        contentType.includes("text/html") || contentType.includes("application/xhtml")
          ? "html"
          : "text";

      console.log(
        "[freecode][webFetch]",
        response.url || parsed.toString(),
        "HTTP",
        response.status,
        "kind=" + kind,
      );

      return ok(
        formatFetchOutput(response.url || parsed.toString(), response.status, kind, text, truncated),
      );
    } catch (err) {
      clearTimeout(timeoutId);
      const e = err as Error;
      if (e.name === "AbortError") return fail("Request timed out (" + FETCH_TIMEOUT_MS + " ms)");
      return fail("Request failed: " + e.message);
    }
  },
};
