# Contributing to freecode

Thanks for your interest in improving freecode! This guide covers the
development setup, coding conventions, and the most common change — adding a new
tool.

---

## Development setup

```bash
git clone <your-repo-url>
cd ZAIToType
npm install
npm start
```

`npm start` compiles the TypeScript sources and launches Electron. For a faster
edit loop, run the watcher in one terminal and Electron in another:

```bash
npm run watch     # terminal 1 — recompiles on change
npx electron .    # terminal 2 — restart after each rebuild
```

Before opening a pull request, make sure the project type-checks cleanly:

```bash
npx tsc --noEmit
```

---

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/main/` | Electron main process: window lifecycle, IPC, data paths, prompt assembly |
| `src/preload/` | Code injected into the z.ai page: agent loop, chat I/O, overlay, login detection |
| `src/providers/` | Per-site adapters (selectors, DOM helpers) |
| `src/tools/` | Tool implementations and the VM sandbox |
| `src/shared/` | Constants and types shared across processes |
| `src/prompt/` | Agent system-prompt template (`system.md`) |
| `scripts/` | Build helpers |

---

## Coding conventions

- **TypeScript, strict mode.** Keep `strict` clean; no `any` unless it is genuinely
  unavoidable, and then narrow it immediately.
- **English only** in code, comments, log messages, prompt templates, and UI text.
  This avoids encoding issues in the Windows console and keeps the codebase
  consistent. The one deliberate exception is the Cyrillic alternative inside the
  login-UI regex in `src/preload/login-detector.ts`, which matches a localized
  button label on the site.
- **Small, focused modules.** One concern per file, named after that concern
  (`FileReadTool.ts`, `login-detector.ts`, …).
- **Prefer plain functions and object literals** over classes unless state or
  inheritance is genuinely needed.
- **No new runtime dependencies** without discussion — the app deliberately ships
  a minimal dependency tree. Dev dependencies are fine when justified.
- **Comments explain *why*, not *what*.** Code should read clearly on its own.
- **Resilience.** Code that touches the z.ai DOM should degrade gracefully: log a
  warning and return a safe fallback rather than throwing.

Formatting is handled by `prettier` defaults: 2-space indentation, double quotes,
semicolons, ~100-column lines.

---

## Adding a new tool

Tools are the primary extension point. Every tool is self-describing: it declares
its name, call signature, and description, and both the sandbox and the system
prompt are generated from the registry — no manual prompt edits required.

### 1. Create the tool module

Add a file under `src/tools/`, e.g. `src/tools/WebFetchTool.ts`:

```ts
import { ok, fail, asObject, ToolDefinition } from "./types";

interface WebFetchParams {
  url: string;
}

export const WebFetchTool: ToolDefinition<WebFetchParams> = {
  name: "webFetch",
  signature: "webFetch(url)",
  description: "Fetch a URL and return its text content.",
  risky: true,
  // mapArgs turns positional sandbox arguments into the params object.
  mapArgs: (a) => ({ url: a[0] }),
  async execute(params, ctx) {
    try {
      // ... implementation ...
      return ok("fetched content");
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};
```

Key fields of `ToolDefinition`:

| Field | Purpose |
| --- | --- |
| `name` | The function name exposed inside a ```free block |
| `signature` | Call shape shown to the model in the system prompt |
| `description` | One-line explanation shown to the model |
| `risky` | Marks tools that mutate state or spawn processes (for future approval gating) |
| `aliases` | Extra sandbox names routed to this tool (e.g. `readLines` → `read`) |
| `mapArgs` | Convert positional sandbox arguments into the tool's params object |
| `execute` | The actual implementation; returns `ok(data)` or `fail(message)` |

### 2. Register it

Import the tool in `src/tools/index.ts` and add it to the array inside
`createDefaultRegistry()`:

```ts
import { WebFetchTool } from "./WebFetchTool";

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  const all = [
    // ... existing tools ...
    WebFetchTool,
  ] as unknown as Array<ToolDefinition<Record<string, unknown>>>;
  for (const tool of all) registry.register(tool);
  return registry;
}
```

That is all. On the next run the tool is:

- callable as `await webFetch("https://example.com")` inside a ```free block,
- listed in the system prompt with its signature and description,
- reported by the `get-tool-names` IPC channel.

### 3. Verify

Rebuild and check that the prompt now mentions your tool:

```bash
npm run build
```

Start the app, select a project, and the tool list in the chat prompt should
include the new entry. A quick way to test the tool body in isolation is to run
it directly from Node against the compiled output.

---

## Working with the z.ai DOM

z.ai is a Svelte single-page app with hashed class names, so selectors can change
without notice. Verified selectors (as of September 2026) live in
`src/providers/zai.ts`:

| Element | Selector |
| --- | --- |
| AI reply | `.chat-assistant` |
| User message | `.chat-user` |
| Code block | `div.language-<lang>` (no `<pre>`/`<code>`) |
| Composer | `textarea#chat-input` |
| Send button | `#send-message-button`, `button.sendMessageButton` |
| Streaming in progress | `#send-message-button` is absent from the DOM |

When you touch DOM-dependent code:

- Keep selectors in the provider, not scattered across modules.
- Guard against missing elements and return a safe fallback.
- Re-check the browser DevTools after any z.ai redesign and update this table.

---

## Commits and pull requests

- Keep commits focused: one logical change per commit.
- Write commit messages in the imperative mood
  (`add webFetch tool`, `fix login marker race`).
- Describe *what* changed and *why* in the pull request body; screenshots or short
  clips help for UI changes.
- Ensure `npx tsc --noEmit` passes and, where relevant, that the agent loop still
  works end to end.

---

## Reporting bugs

Please include:

- operating system and Node.js version,
- the exact steps to reproduce,
- console output from the app window (`Ctrl+Shift+I` → Console), especially lines
  starting with `[freecode]`,
- what you expected versus what happened.

---

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
