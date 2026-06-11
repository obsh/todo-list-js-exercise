// Task data layer: the single source of truth for todo state.
//
// Every task is one object { id, title, complete }. Tasks live in this array;
// ids are assigned from a monotonic counter so an id stays stable for a task's
// lifetime and is never reused after deletion.
//
// Both the CLI (cli.js) and the test suite import it. The core task operations
// remain in-memory; explicit load/save helpers persist that state as JSON when
// the CLI starts or mutates tasks.
const fs = require("fs");
const path = require("path");

const tasks = [];
let nextId = 1;

function resetTasks() {
  tasks.length = 0;
  nextId = 1;
}

// Look up a task by id. Returns the task object, or undefined if not found.
// Internal helper — callers that require the task to exist should use getTask.
function findTask(id) {
  return tasks.find((task) => task.id === id);
}

// Create a new task. Titles must be non-empty strings.
// A new task is always created as incomplete. Returns the created task.
function newTask(title) {
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("newTask: title must be a non-empty string");
  }

  const task = { id: nextId, title, complete: false };
  nextId += 1;
  tasks.push(task);
  return task;
}

// Fetch a single task by id. Throws if no task has that id.
function getTask(id) {
  const task = findTask(id);
  if (!task) {
    throw new Error(`getTask: no task with id ${id}`);
  }
  return task;
}

// Mark a task as complete. Throws if no task has that id.
// Returns the updated task.
function completeTask(id) {
  const task = getTask(id);
  task.complete = true;
  return task;
}

// Remove a task by id. Throws if no task has that id.
// Returns the deleted task.
function deleteTask(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    throw new Error(`deleteTask: no task with id ${id}`);
  }
  const [deleted] = tasks.splice(index, 1);
  return deleted;
}

// Return a snapshot of all tasks. The array is a copy so callers cannot mutate
// internal state by reference, but the task objects themselves are shared.
function listTasks() {
  return [...tasks];
}

function validateTask(task, index) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error(`loadTasks: task ${index} must be an object`);
  }
  if (!Number.isInteger(task.id) || task.id < 1) {
    throw new Error(`loadTasks: task ${index} has an invalid id`);
  }
  if (typeof task.title !== "string" || task.title.trim() === "") {
    throw new Error(`loadTasks: task ${index} has an invalid title`);
  }
  if (typeof task.complete !== "boolean") {
    throw new Error(`loadTasks: task ${index} has an invalid complete flag`);
  }
  return { id: task.id, title: task.title, complete: task.complete };
}

function normalizePersistedState(raw) {
  const persistedTasks = Array.isArray(raw) ? raw : raw && raw.tasks;
  if (!Array.isArray(persistedTasks)) {
    throw new Error("loadTasks: JSON must contain a tasks array");
  }

  const seenIds = new Set();
  const normalizedTasks = persistedTasks.map((task, index) => {
    const normalizedTask = validateTask(task, index);
    if (seenIds.has(normalizedTask.id)) {
      throw new Error(`loadTasks: duplicate task id ${normalizedTask.id}`);
    }
    seenIds.add(normalizedTask.id);
    return normalizedTask;
  });

  const computedNextId =
    normalizedTasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;

  if (Array.isArray(raw) || raw.nextId === undefined) {
    return { tasks: normalizedTasks, nextId: computedNextId };
  }

  if (!Number.isInteger(raw.nextId) || raw.nextId < computedNextId) {
    throw new Error("loadTasks: nextId must be greater than all task ids");
  }

  return { tasks: normalizedTasks, nextId: raw.nextId };
}

function loadTasks(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      resetTasks();
      return false;
    }
    throw error;
  }

  const persisted = normalizePersistedState(JSON.parse(text));
  tasks.length = 0;
  tasks.push(...persisted.tasks);
  nextId = persisted.nextId;
  return true;
}

function saveTasks(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const state = {
    nextId,
    tasks: listTasks(),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

module.exports = {
  newTask,
  getTask,
  completeTask,
  deleteTask,
  listTasks,
  loadTasks,
  saveTasks,
  resetTasks,
};
