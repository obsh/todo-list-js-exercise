# Todo List

Todo List is a small task manager with an interactive command-line interface and a minimal web UI. Tasks are persisted to a JSON file, so they survive CLI and server restarts.

## Requirements

- Node.js 18 or newer
- npm

Install dependencies:

```sh
npm install
```

## CLI Usage

Start the interactive CLI:

```sh
npm start
```

The CLI stores tasks in `tasks.json` in the current working directory. To use a different data file, set `TODO_FILE`:

```sh
TODO_FILE=/tmp/todo-tasks.json npm start
```

Available commands:

- `add <title>` - add a new task
- `list` - list all tasks
- `complete <id>` - mark a task complete
- `delete <id>` - remove a task
- `help` - show the command list
- `exit` or `quit` - quit the CLI

Example session:

```text
Interactive todo. Type "help" for commands.
todo> list
No tasks yet.
todo> add Buy milk
Added [ ] #1 Buy milk
todo> add Write README
Added [ ] #2 Write README
todo> list
[ ] #1 Buy milk
[ ] #2 Write README
todo> complete 1
Completed [x] #1 Buy milk
todo> delete 2
Deleted [ ] #2 Write README
todo> list
[x] #1 Buy milk
todo> exit
Bye.
```

## Web UI

Start the HTTP server:

```sh
npm run web
```

By default, the server listens at:

```text
http://127.0.0.1:3000
```

Open that URL in a browser to add tasks, view the current task list, mark tasks complete, and delete tasks. The server uses the same `tasks.json` default data file as the CLI, or the path from `TODO_FILE` when set:

```sh
TODO_FILE=/tmp/todo-tasks.json npm run web
```

You can override the host or port with `HOST` and `PORT`:

```sh
HOST=127.0.0.1 PORT=4000 npm run web
```

## Data Persistence

Tasks are saved as JSON in `tasks.json` in the directory where you run the app. The file contains the task list and the next task id, so completed tasks, deleted tasks, and id numbering survive restarts.

Set `TODO_FILE` to choose another JSON file path.

## Running Tests

Run the test suite:

```sh
npm test
```

The suite currently has 33 Vitest tests across `cli.test.js`, `tasks.test.js`, and `server.test.js`.

## Project Structure

- `cli.js` - interactive readline CLI and user-facing command formatting
- `tasks.js` - task data layer, validation, id assignment, and JSON persistence
- `server.js` - HTTP server, static file serving, and JSON API routes
- `public/index.html` - web UI markup
- `public/app.js` - browser-side task interactions
- `public/style.css` - web UI styles
- `cli.test.js` - CLI parser, formatter, and dispatcher tests
- `tasks.test.js` - task data and persistence tests
- `server.test.js` - web API tests
- `package.json` - npm scripts and project metadata
