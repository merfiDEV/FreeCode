import type { ToolDefinition, ToolContext } from "./types";
import { ok, fail, asObject } from "./types";
import * as todoStore from "../main/todo-store";
import type { TodoStatus } from "../main/todo-store";

/**
 * Todo tools: a structured task list for the current window.
 *   - todoWrite(todos)          — replace the whole list
 *   - todoEdit(id, patch)       — patch one task
 *   - todoDelete(id)            — remove one task
 */

const STATUSES: TodoStatus[] = ["pending", "in_progress", "completed"];

interface TodoItem {
  content: string;
  status: TodoStatus;
}

function parseTodoList(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) throw new Error("todos must be an array");
  const result: TodoItem[] = [];
  const seen = new Set<string>();
  let active = 0;

  for (const item of raw) {
    if (!item || typeof item !== "object") throw new Error("invalid todo: item must be an object");
    const rec = item as Record<string, unknown>;
    const content = String(rec.content ?? "").trim();
    if (!content) throw new Error("invalid todo: content must be a non-empty string");
    if (seen.has(content)) throw new Error("invalid todos: duplicate content " + JSON.stringify(content));
    seen.add(content);
    if (!STATUSES.includes(rec.status as TodoStatus)) throw new Error("invalid todo status: " + String(rec.status));
    if (rec.status === "in_progress") active++;
    result.push({ content, status: rec.status as TodoStatus });
  }
  if (active > 1) throw new Error("invalid todos: at most one task may be in_progress (got " + active + ")");
  return result;
}

function counts(list: todoStore.TodoTask[]) {
  const c = (s: TodoStatus) => list.filter((t) => t.status === s).length;
  return { pending: c("pending"), inProgress: c("in_progress"), completed: c("completed") };
}

/** The window id a tool call belongs to. */
function senderIdOf(ctx: ToolContext): number {
  return ctx.senderId ?? 0;
}

interface WriteParams {
  todos: TodoItem[];
}

export const TodoWriteTool: ToolDefinition<WriteParams> = {
  name: "todoWrite",
  signature: "todoWrite(todos)",
  description:
    "Record or replace the structured task list for the current work. Each call sends the full list (no partial updates).",
  mapArgs: (a) => ({ todos: a[0] as TodoItem[] }),
  async execute(params, ctx) {
    try {
      const list = parseTodoList(params.todos);
      const saved = todoStore.setList(senderIdOf(ctx), list);
      const c = counts(saved);
      const summary =
        "Updated todo list: " + c.pending + " pending, " + c.inProgress + " in progress, " + c.completed + " completed.";
      const rows = saved.map((t) => t.id + " [" + t.status + "] " + t.content).join("\n");
      return ok(summary + "\n" + rows);
    } catch (err) {
      return fail("Failed to update the todo list: " + (err as Error).message);
    }
  },
};

interface EditParams {
  id: string;
  content?: string;
  status?: TodoStatus;
}

export const TodoEditTool: ToolDefinition<EditParams> = {
  name: "todoEdit",
  signature: "todoEdit(id, { content?, status? })",
  description: "Change one task by id: its text and/or status.",
  mapArgs: (a) => {
    const patch = asObject(a[1]);
    return { id: a[0] as string, content: patch.content as string | undefined, status: patch.status as TodoStatus | undefined };
  },
  async execute(params, ctx) {
    if (!params.id) return fail("id is required");
    if (params.content === undefined && params.status === undefined) {
      return fail("nothing to update: pass content and/or status");
    }
    const r = todoStore.editTask(senderIdOf(ctx), params.id, {
      content: params.content,
      status: params.status,
    });
    if (!r.ok) return fail("Failed to update the task: " + r.error);
    return ok("Task " + params.id + " updated.");
  },
};

interface DeleteParams {
  id: string;
}

export const TodoDeleteTool: ToolDefinition<DeleteParams> = {
  name: "todoDelete",
  signature: "todoDelete(id)",
  description: "Remove one task from the list by id.",
  mapArgs: (a) => ({ id: a[0] as string }),
  async execute(params, ctx) {
    if (!params.id) return fail("id is required");
    const r = todoStore.deleteTask(senderIdOf(ctx), params.id);
    if (!r.ok) return fail("Failed to delete the task: " + r.error);
    return ok("Task " + params.id + " deleted.");
  },
};
