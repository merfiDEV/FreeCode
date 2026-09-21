import { clipboard } from "electron";
import { ok, fail, ToolDefinition } from "./types";

interface WriteClipboardParams {
  text: string;
}

export const ReadClipboardTool: ToolDefinition<Record<string, never>> = {
  name: "readClipboard",
  signature: "readClipboard()",
  description: "Read the current text content of the system clipboard.",
  mapArgs: () => ({}),
  async execute() {
    try {
      const text = clipboard.readText();
      return ok(text);
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};

export const WriteClipboardTool: ToolDefinition<WriteClipboardParams> = {
  name: "writeClipboard",
  signature: "writeClipboard(text)",
  description: "Write text to the system clipboard.",
  mapArgs: (a) => ({ text: String(a[0] ?? "") }),
  async execute(params) {
    try {
      clipboard.writeText(params.text);
      return ok("Text successfully written to clipboard.");
    } catch (err) {
      return fail((err as Error).message);
    }
  },
};
