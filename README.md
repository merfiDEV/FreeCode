# freecode

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-8b93ff?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2016-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node">
</p>

<p align="center">
  <strong>English</strong> · <a href="README.ru.md">Русский</a>
</p>

**freecode** is a zero-token-cost AI agent for your desktop. It embeds the
[z.ai](https://chat.z.ai/) web chat into a native Electron window and turns that
chat into a local executor: the model is instructed to answer with tool calls
written as JavaScript inside a ```free code block, the preload script
intercepts those blocks, runs them in a sandboxed Node VM in the main process,
and streams the output back to the model. No API key, no token billing — you use
your regular web account.

---

## Why it exists

Web chats are great at *thinking*, but they cannot *act* on your machine.
freecode closes that loop:

- **Zero token cost** — everything goes through the z.ai web UI, no API calls.
- **Real agent loop** — Think → Act → Observe → Repeat. File I/O, code search, shell commands.
- **Native desktop shell** — an Electron wrapper with a small overlay panel.
- **Persistent login** — sign in once; the session is stored outside the app and reused on every launch.

---

## Features

- **Tool calls as code blocks.** The model replies with ```free blocks; each one is parsed from the DOM, executed in a locked-down VM, and its output is fed back into the chat as a user message.
- **Sandboxed execution.** `vm.createContext` with `codeGeneration: { strings: false, wasm: false }`; no `require`, `process`, or `global`; a 30 s synchronous and 60 s overall deadline per block.
- **Dynamic tool registry.** Every tool describes its own call signature, so the system prompt is generated from the registry — add a tool and it is documented automatically.
- **Safety gate.** A deny-list blocks destructive shell commands (`rm -rf /`, `format C:`, `mkfs`, `shutdown`, …) before they ever reach a shell.
- **One-time sign-in.** The app opens `/auth` on first run, records a marker after a successful login, and starts on the chat page afterwards.
- **Chrome UA masking.** User-Agent and Client Hints are rewritten so z.ai sees an ordinary Chrome browser.
- **Overlay control panel.** Shows the current project directory, lets you change it, tune the send delay, and displays the task currently running plus its result.
- **Localized UI.** The overlay ships with English and Russian, auto-selected from the browser locale and switchable at runtime with the `EN`/`RU` button in the panel (the choice is persisted in `settings.json`).
- **Portable data folder.** Everything persistent lives in `<home>/freecode` (see below).

---

## Requirements

- Node.js >= 16
- npm

## Getting started

```bash
git clone <your-repo-url>
cd ZAIToType

npm install
npm start
```

`npm start` builds the TypeScript sources into `dist/` and launches Electron.

### First run

1. The z.ai auth page opens. Sign in once (Google / Email / GitHub).
2. After a successful login a marker is written and the app moves to the chat.
3. Click **Select project** in the bottom-right overlay and pick a directory.
   freecode sends the agent prompt — tool list, platform info, project tree —
   into the chat.
4. Chat with the model. When it answers with a ```free block, the tools run and
   the result returns to the model automatically.

### Scripts

| Command | Description |
| --- | --- |
| `npm start` | Build and launch the app |
| `npm run build` | Compile TypeScript and copy prompt assets into `dist/` |
| `npm run watch` | Recompile on change (run in a separate terminal) |
| `npm run clean` | Remove `dist/` |
| `npx tsc --noEmit` | Type-check without emitting files |

---

## Data folder

All persistent data lives outside the app bundle, in `<home>/freecode`:

| Platform | Path |
| --- | --- |
| Windows | `C:\Users\<user>\freecode` |
| macOS | `/Users/<user>/freecode` |
| Linux | `/home/<user>/freecode` |

Override the location with the `FREE_CODE_HOME` environment variable.

The folder holds the Chromium profile (login session), caches, the
`.logged-in` marker, `settings.json` (send delay and UI language), and
`projects.json` (which project directory belongs to which chat).
Deleting it forces a fresh sign-in; updating or reinstalling the app does
**not** touch it.

---

## Available tools

Tools are registered in `createDefaultRegistry()` and are available inside every
```free block as async functions.

| Tool | Signature | Description |
| --- | --- | --- |
| `read` | `read(filePath, { offset?, limit? })` | Read a UTF-8 file with line numbers |
| `write` | `write(filePath, content)` | Create or overwrite a file |
| `edit` | `edit(filePath, oldString, newString, replaceAll?, dryRun?)` | Replace a literal string |
| `deleteFile` | `deleteFile(filePath)` | Delete a single file |
| `glob` | `glob(pattern, searchPath?)` | Find files by glob pattern |
| `grep` | `grep(pattern, { path?, include? })` | Search file contents with a regex |
| `bash` | `bash(command, { workdir?, timeoutMs? })` | Run a shell command (cmd.exe on Windows) |
| `pwsh` | `pwsh(command, { workdir?, timeoutMs? })` | Run a PowerShell command |

Aliases kept for compatibility: `readLines` → `read`, `writeFile` → `write`,
`editFile` → `edit`. The helper `log(...)` prints intermediate values, and
`projectDir` exposes the current project root.

### Example tool call

```free
const pkg = JSON.parse(await read("package.json"));
log("name:", pkg.name);
log("version:", pkg.version);
log("scripts:", Object.keys(pkg.scripts || {}).join(", "));
```

---

## Architecture

```
src/
  main/        Electron main process
    index.ts            App bootstrap, window lifecycle, UA mask
    window.ts           BrowserWindow creation (persistent partition)
    ipc.ts              IPC handlers (execute-js, init-project, …)
    project-context.ts  Directory tree + system-prompt assembly
    window-context.ts   Per-window project directory + session tracking
    project-store.ts    Persistent sessionId → project directory mapping
    paths.ts            <home>/freecode data root and login marker
    settings-store.ts   User settings (send delay, language)
    user-agent.ts       Chrome User-Agent / Client Hints masking

  preload/     Injected into the z.ai page
    index.ts            Boot, SPA navigation sync
    observer.ts         Agent loop (watches for finished replies)
    block-parser.ts     Extracts ```free blocks
    chat-input.ts       Composer fill / send helpers
    overlay.ts          Bottom-right control panel
    login-detector.ts   One-time sign-in detection
    stealth.ts          navigator.webdriver / window.chrome masking
    i18n/               Overlay translations (en, ru) and t() helper
    ipc.ts, api.ts      Typed IPC access from the preload world

  providers/   Site adapters
    zai.ts              z.ai selectors and DOM helpers
    index.ts            Provider registry

  tools/       Node-side tool implementations + sandbox
    types.ts            ToolDefinition, ok/fail, asObject
    ToolRegistry.ts     Tool registry
    JsRunner.ts         VM sandbox for ```free blocks
    FileReadTool.ts, FileWriteTool.ts, FileEditTool.ts, FileDeleteTool.ts
    GlobTool.ts, GrepTool.ts, BashTool.ts, PwshTool.ts
    dangerous.ts        Command deny-list
    path-utils.ts       Project-relative path resolution

  shared/      Cross-process constants and types
  prompt/      system.md — agent instruction template

scripts/
  copy-assets.js        Copies non-TS assets (prompt templates) into dist/
```

### How the agent loop works

1. The user selects a project; the main process builds the system prompt
   (template + generated tool list + platform info + project tree).
2. The model answers with one or more ```free blocks.
3. `observer.ts` waits for the reply to finish (the send button is restored to
   the composer) and extracts the blocks from the DOM (`div.language-free`).
4. Each block is sent over IPC to `JsRunner`, which executes it in a VM and
   returns a text digest.
5. The combined digest is inserted into the composer and sent back to the model.
6. The model analyses the output and continues, or gives a final answer.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the
development workflow, coding style, and how to add a new tool.

---

## License

[MIT](LICENSE)
