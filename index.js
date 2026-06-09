// Single source of truth: every task is one object { id, title, complete }.
// Tasks live in this array; ids are assigned from a monotonic counter so an
// id stays stable for a task's lifetime and is never reused after deletion.
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

// Print the state of a task to the console in a nice readable way.
function logTaskState(id) {
  const task = getTask(id);
  const status = task.complete ? " " : " not ";
  console.log(`#${task.id} ${task.title} has${status}been completed`);
}

// Export the data layer so Phase 2 can unit-test these operations.
module.exports = {
  newTask,
  getTask,
  completeTask,
  deleteTask,
  listTasks,
};

// DRIVER CODE BELOW — exercises add/complete/delete/list. Only runs when this
// file is executed directly (node index.js), not when required by tests.
if (require.main === module) {
  const litter = newTask("Clean Cat Litter");
  const laundry = newTask("Do Laundry");
  const dishes = newTask("Wash Dishes");

  console.log("Initial tasks:");
  logTaskState(litter.id); // not completed
  logTaskState(laundry.id); // not completed
  logTaskState(dishes.id); // not completed

  console.log("\nCompleting 'Clean Cat Litter'...");
  completeTask(litter.id);
  logTaskState(litter.id); // completed

  console.log("\nDeleting 'Do Laundry'...");
  deleteTask(laundry.id);

  console.log("\nRemaining tasks:");
  for (const task of listTasks()) {
    const status = task.complete ? "done" : "todo";
    console.log(`  [${status}] #${task.id} ${task.title}`);
  }

  console.log("\nValidation: completing a non-existent task throws...");
  try {
    completeTask(999);
  } catch (error) {
    console.log(`  caught expected error: ${error.message}`);
  }
}
