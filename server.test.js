import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let server;
let baseUrl;
let dataFile;

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-web-"));
  return path.join(dir, "tasks.json");
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json();
  return { response, body };
}

beforeEach(async () => {
  vi.resetModules();
  dataFile = tempFile();
  const { createServer } = await import("./server.js");
  server = createServer({ dataFile });
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("todo web API", () => {
  it("starts with an empty persisted task list", async () => {
    const { response, body } = await request("/api/tasks");

    expect(response.status).toBe(200);
    expect(body).toEqual({ tasks: [] });
  });

  it("adds, completes, deletes, and persists tasks", async () => {
    const created = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Ship UI" }),
    });
    expect(created.response.status).toBe(201);
    expect(created.body.task).toEqual({
      id: 1,
      title: "Ship UI",
      complete: false,
    });

    const completed = await request("/api/tasks/1/complete", { method: "POST" });
    expect(completed.body.task.complete).toBe(true);

    let stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    expect(stored.tasks).toEqual([
      { id: 1, title: "Ship UI", complete: true },
    ]);

    const deleted = await request("/api/tasks/1", { method: "DELETE" });
    expect(deleted.response.status).toBe(200);

    stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    expect(stored.tasks).toEqual([]);
  });

  it("rejects empty titles and unknown ids with useful statuses", async () => {
    const badCreate = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "   " }),
    });
    expect(badCreate.response.status).toBe(400);
    expect(badCreate.body.error).toMatch(/title/);

    const missing = await request("/api/tasks/99/complete", { method: "POST" });
    expect(missing.response.status).toBe(404);
    expect(missing.body.error).toBe("No task with id 99");
  });
});
