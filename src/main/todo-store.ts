/**
 * Per-window todo storage.
 *
 * Tasks live in the main process keyed by webContents id, so they survive a
 * page reload but not an app restart (which matches the original behaviour).
 */

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoTask {
  id: string;
  content: string;
  status: TodoStatus;
}

const STATUSES: TodoStatus[] = ["pending", "in_progress", "completed"];

const byWindow = new Map<number, TodoTask[]>();
let idCounter = 0;

/** Listeners notified when a window's list changes. */
type ChangeListener = (senderId: number, todos: TodoTask[]) => void;
const listeners = new Set<ChangeListener>();

/** Subscribe to list changes. Returns an unsubscribe function. */
export function onChange(cb: ChangeListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(senderId: number): void {
  const todos = getList(senderId);
  for (const cb of listeners) {
    try {
      cb(senderId, todos);
    } catch {
      /* ignore */
    }
  }
}

function nextId(): string {
  return "todo_" + Date.now().toString(36) + "_" + ++idCounter;
}

function getRaw(senderId: number): TodoTask[] {
  return byWindow.get(senderId) ?? [];
}

/** Copy of the window's task list. */
export function getList(senderId: number): TodoTask[] {
  return getRaw(senderId).map((t) => ({ id: t.id, content: t.content, status: t.status }));
}

/** Replace the whole list; each task gets an id. */
export function setList(senderId: number, todos: Array<{ id?: string; content: string; status: TodoStatus }>): TodoTask[] {
  const list: TodoTask[] = todos.map((t) => ({
    id: t.id ?? nextId(),
    content: String(t.content ?? "").trim(),
    status: t.status,
  }));
  byWindow.set(senderId, list);
  notify(senderId);
  return getList(senderId);
}

/** Patch one task by id. */
export function editTask(
  senderId: number,
  id: string,
  patch: { content?: string; status?: TodoStatus },
): { ok: boolean; error?: string } {
  const list = getRaw(senderId);
  const task = list.find((t) => t.id === id);
  if (!task) return { ok: false, error: "task not found: " + id };
  if (patch.content !== undefined) {
    const c = String(patch.content ?? "").trim();
    if (!c) return { ok: false, error: "content must be a non-empty string" };
    task.content = c;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return { ok: false, error: "invalid status: " + patch.status };
    task.status = patch.status;
  }
  notify(senderId);
  return { ok: true };
}

/** Remove a task by id. */
export function deleteTask(senderId: number, id: string): { ok: boolean; error?: string } {
  const list = getRaw(senderId);
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, error: "task not found: " + id };
  list.splice(idx, 1);
  notify(senderId);
  return { ok: true };
}

/** Drop the window's tasks. */
export function clear(senderId: number): void {
  byWindow.delete(senderId);
}

export { STATUSES };
