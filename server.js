#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const store = require("./tasks");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_DATA_FILE = path.join(process.cwd(), "tasks.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function getDataFile() {
  return process.env.TODO_FILE || DEFAULT_DATA_FILE;
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  res.end(`${JSON.stringify(body)}\n`);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  res.end(message);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (raw.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function parseTaskId(pathname) {
  const match = pathname.match(/^\/api\/tasks\/(\d+)(?:\/complete)?$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function persist(dataFile) {
  store.saveTasks(dataFile);
}

async function handleApi(req, res, pathname, dataFile) {
  if (req.method === "GET" && pathname === "/api/tasks") {
    sendJson(res, 200, { tasks: store.listTasks() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/tasks") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    try {
      const task = store.newTask(body.title);
      persist(dataFile);
      sendJson(res, 201, { task });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && /^\/api\/tasks\/\d+\/complete$/.test(pathname)) {
    const id = parseTaskId(pathname);
    try {
      const task = store.completeTask(id);
      persist(dataFile);
      sendJson(res, 200, { task });
    } catch {
      sendJson(res, 404, { error: `No task with id ${id}` });
    }
    return;
  }

  if (req.method === "DELETE" && /^\/api\/tasks\/\d+$/.test(pathname)) {
    const id = parseTaskId(pathname);
    try {
      const task = store.deleteTask(id);
      persist(dataFile);
      sendJson(res, 200, { task });
    } catch {
      sendJson(res, 404, { error: `No task with id ${id}` });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const fullPath = path.join(PUBLIC_DIR, requestedPath);
  const relative = path.relative(PUBLIC_DIR, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return fullPath;
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  let filePath;
  try {
    filePath = resolveStaticPath(pathname);
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, error.code === "ENOENT" ? 404 : 500, "Not found");
      return;
    }
    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}

function createServer(options = {}) {
  const dataFile = options.dataFile || getDataFile();
  store.loadTasks(dataFile);

  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      handleApi(req, res, url.pathname, dataFile).catch((error) => {
        sendJson(res, 500, { error: error.message });
      });
      return;
    }
    serveStatic(req, res, url.pathname);
  });
}

function startServer() {
  const host = process.env.HOST || DEFAULT_HOST;
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be an integer between 1 and 65535");
    process.exit(1);
  }

  let server;
  try {
    server = createServer();
  } catch (error) {
    console.error(`Could not load tasks from ${getDataFile()}: ${error.message}`);
    process.exit(1);
  }

  server.listen(port, host, () => {
    console.log(`Todo web UI listening at http://${host}:${port}`);
  });
}

module.exports = {
  createServer,
  getDataFile,
  handleApi,
};

if (require.main === module) {
  startServer();
}
