#!/usr/bin/env node
// Interactive todo CLI.
//
// Design choice: a readline REPL, not argv-style subcommands (commander/yargs).
// Rationale: task state is in-memory only — persistence to disk is Phase 4. An
// argv tool starts a fresh process per command, so `add` then `list` would show
// nothing. A REPL keeps one process alive, so tasks accumulate across commands
// within a session. It also needs zero extra dependencies (readline is built
// into Node), satisfying the "keep dependencies minimal" requirement.
//
// All task mutations go through the tasks.js data layer — this file never
// reimplements task logic, it only parses input and renders output.

const readline = require("readline");
const store = require("./tasks");

const PROMPT = "todo> ";

const HELP = `Commands:
  add <title>     Add a new task
  list            List all tasks
  complete <id>   Mark a task complete
  delete <id>     Remove a task
  help            Show this help
  exit            Quit
`;

// Parse a typed line into a command and its argument. The command is the first
// whitespace-delimited token (lowercased); the argument is the untouched
// remainder, so multi-word titles ("add Buy more milk") survive intact.
function parseLine(line) {
  const trimmed = line.trim();
  if (trimmed === "") {
    return { command: "", arg: "" };
  }
  const spaceIndex = trimmed.search(/\s/);
  if (spaceIndex === -1) {
    return { command: trimmed.toLowerCase(), arg: "" };
  }
  return {
    command: trimmed.slice(0, spaceIndex).toLowerCase(),
    arg: trimmed.slice(spaceIndex + 1).trim(),
  };
}

// Render one task as a single readable line with id + completion status.
function formatTask(task) {
  const box = task.complete ? "[x]" : "[ ]";
  return `${box} #${task.id} ${task.title}`;
}

// Render the full task list, or a friendly placeholder when empty.
function formatList(tasks) {
  if (tasks.length === 0) {
    return "No tasks yet.";
  }
  return tasks.map(formatTask).join("\n");
}

// Parse an id argument into a positive integer, or null if it is not a valid
// id. Keeps the dispatcher's error handling uniform for bad/ missing ids.
function parseId(arg) {
  if (!/^\d+$/.test(arg)) {
    return null;
  }
  return Number.parseInt(arg, 10);
}

// Execute a single parsed command against the data layer. `out` is the sink for
// user-facing lines (console.log in production, captured in tests). Returns
// `true` when the caller should keep the REPL running, `false` to quit.
//
// Every data-layer call that can throw (unknown id, empty title) is guarded so
// the user sees a clear message instead of a raw stack trace.
function dispatch(command, arg, out) {
  switch (command) {
    case "":
      return true;

    case "add": {
      if (arg === "") {
        out("Usage: add <title>  (title cannot be empty)");
        return true;
      }
      const task = store.newTask(arg);
      out(`Added ${formatTask(task)}`);
      return true;
    }

    case "list":
      out(formatList(store.listTasks()));
      return true;

    case "complete": {
      const id = parseId(arg);
      if (id === null) {
        out("Usage: complete <id>  (id must be a number)");
        return true;
      }
      try {
        const task = store.completeTask(id);
        out(`Completed ${formatTask(task)}`);
      } catch {
        out(`No task with id ${id}`);
      }
      return true;
    }

    case "delete": {
      const id = parseId(arg);
      if (id === null) {
        out("Usage: delete <id>  (id must be a number)");
        return true;
      }
      try {
        const task = store.deleteTask(id);
        out(`Deleted ${formatTask(task)}`);
      } catch {
        out(`No task with id ${id}`);
      }
      return true;
    }

    case "help":
      out(HELP);
      return true;

    case "exit":
    case "quit":
      return false;

    default:
      out(`Unknown command: ${command}. Type "help" for the command list.`);
      return true;
  }
}

// Wire the pure dispatcher up to a live readline interface. Each entered line is
// parsed and dispatched; when dispatch signals quit (or input closes), the loop
// shuts down cleanly.
function startRepl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT,
  });

  console.log('Interactive todo. Type "help" for commands.');
  rl.prompt();

  rl.on("line", (line) => {
    const { command, arg } = parseLine(line);
    const keepGoing = dispatch(command, arg, (msg) => console.log(msg));
    if (!keepGoing) {
      rl.close();
      return;
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Bye.");
    process.exit(0);
  });
}

module.exports = { parseLine, formatTask, formatList, dispatch, startRepl };

if (require.main === module) {
  startRepl();
}
