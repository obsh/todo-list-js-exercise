// Task data layer: the single source of truth for todo state.
//
// Every task is one object { id, title, complete }. Tasks live in this array;
// ids are assigned from a monotonic counter so an id stays stable for a task's
// lifetime and is never reused after deletion.
//
// This module is pure data logic — no I/O. Both the CLI (cli.js) and the test
// suite import it. Persistence to disk is intentionally out of scope here
// (that is Phase 4); state lives only for the lifetime of the process.
const tasks = [];
let nextId = 1;

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

module.exports = {
  newTask,
  getTask,
  completeTask,
  deleteTask,
  listTasks,
};
