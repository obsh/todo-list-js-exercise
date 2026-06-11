// Unit tests for the task data layer in tasks.js.
//
// State isolation: tasks.js keeps module-level `tasks`/`nextId` that persist
// across calls. To stop state bleeding between cases, each test starts from a
// fresh copy of the module. `vi.resetModules()` clears the module cache and we
// re-import tasks.js in beforeEach, so every test gets brand-new `tasks`/
// `nextId`.

import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let newTask;
let getTask;
let completeTask;
let deleteTask;
let listTasks;
let loadTasks;
let saveTasks;

beforeEach(async () => {
  vi.resetModules();
  const todo = await import("./tasks.js");
  ({
    newTask,
    getTask,
    completeTask,
    deleteTask,
    listTasks,
    loadTasks,
    saveTasks,
  } = todo.default);
});

describe("newTask", () => {
  it("creates an incomplete task and returns it", () => {
    const task = newTask("Wash Dishes");
    expect(task).toEqual({ id: 1, title: "Wash Dishes", complete: false });
  });

  it("assigns increasing ids", () => {
    const first = newTask("A");
    const second = newTask("B");
    const third = newTask("C");
    expect([first.id, second.id, third.id]).toEqual([1, 2, 3]);
  });

  it("does not reuse ids after deletion", () => {
    const first = newTask("A");
    newTask("B");
    deleteTask(first.id);
    const third = newTask("C");
    expect(third.id).toBe(3);
  });

  it("throws on an empty title", () => {
    expect(() => newTask("")).toThrow();
  });

  it("throws on a whitespace-only title", () => {
    expect(() => newTask("   ")).toThrow();
  });

  it("throws on a non-string title", () => {
    expect(() => newTask(42)).toThrow();
    expect(() => newTask(null)).toThrow();
    expect(() => newTask(undefined)).toThrow();
  });
});

describe("getTask", () => {
  it("returns the task with the given id", () => {
    const created = newTask("Do Laundry");
    expect(getTask(created.id)).toBe(created);
  });

  it("throws on an unknown id", () => {
    expect(() => getTask(999)).toThrow();
  });
});

describe("completeTask", () => {
  it("flips complete to true and returns the task", () => {
    const created = newTask("Clean Cat Litter");
    expect(created.complete).toBe(false);
    const updated = completeTask(created.id);
    expect(updated.complete).toBe(true);
    expect(getTask(created.id).complete).toBe(true);
  });

  it("throws on an unknown id", () => {
    expect(() => completeTask(999)).toThrow();
  });
});

describe("deleteTask", () => {
  it("removes the task and returns it", () => {
    const created = newTask("Temporary");
    const deleted = deleteTask(created.id);
    expect(deleted).toEqual(created);
    expect(() => getTask(created.id)).toThrow();
  });

  it("leaves the remaining tasks intact", () => {
    const keep1 = newTask("Keep 1");
    const remove = newTask("Remove");
    const keep2 = newTask("Keep 2");
    deleteTask(remove.id);
    const remaining = listTasks();
    expect(remaining).toEqual([keep1, keep2]);
  });

  it("throws on an unknown id", () => {
    expect(() => deleteTask(999)).toThrow();
  });
});

describe("listTasks", () => {
  it("returns all tasks", () => {
    const a = newTask("A");
    const b = newTask("B");
    expect(listTasks()).toEqual([a, b]);
  });

  it("returns an empty list when there are no tasks", () => {
    expect(listTasks()).toEqual([]);
  });

  it("returns a copy: mutating the result does not affect internal state", () => {
    newTask("A");
    const snapshot = listTasks();
    snapshot.push({ id: 99, title: "Injected", complete: false });
    expect(listTasks()).toHaveLength(1);
  });
});

describe("JSON persistence", () => {
  function tempFile() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-list-"));
    return path.join(dir, "tasks.json");
  }

  it("saves tasks and reloads them into a fresh module instance", async () => {
    const file = tempFile();
    newTask("A");
    completeTask(1);
    deleteTask(newTask("B").id);
    const c = newTask("C");
    saveTasks(file);

    vi.resetModules();
    const fresh = (await import("./tasks.js")).default;
    expect(fresh.loadTasks(file)).toBe(true);
    expect(fresh.listTasks()).toEqual([
      { id: 1, title: "A", complete: true },
      { id: 3, title: "C", complete: false },
    ]);
    expect(fresh.newTask("D").id).toBe(c.id + 1);
  });

  it("starts empty when the persistence file does not exist", () => {
    const file = tempFile();
    newTask("Before load");

    expect(loadTasks(file)).toBe(false);
    expect(listTasks()).toEqual([]);
    expect(newTask("After load").id).toBe(1);
  });

  it("rejects corrupt persisted task data", () => {
    const file = tempFile();
    fs.writeFileSync(
      file,
      JSON.stringify({ nextId: 2, tasks: [{ id: 2, title: "", complete: false }] }),
    );

    expect(() => loadTasks(file)).toThrow(/invalid title/);
  });
});
