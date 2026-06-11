const form = document.querySelector("#add-form");
const input = document.querySelector("#title-input");
const list = document.querySelector("#tasks");
const summary = document.querySelector("#summary");
const errorBox = document.querySelector("#error");

let tasks = [];

function setError(message) {
  if (!message) {
    errorBox.hidden = true;
    errorBox.textContent = "";
    return;
  }
  errorBox.hidden = false;
  errorBox.textContent = message;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body;
}

function render() {
  const completed = tasks.filter((task) => task.complete).length;
  const remaining = tasks.length - completed;
  summary.textContent =
    tasks.length === 0
      ? "No tasks yet."
      : `${remaining} remaining, ${completed} complete`;

  list.replaceChildren(
    ...tasks.map((task) => {
      const item = document.createElement("li");
      item.className = `task${task.complete ? " task--complete" : ""}`;

      const status = document.createElement("span");
      status.className = "task__status";
      status.textContent = task.complete ? "[x]" : "[ ]";

      const title = document.createElement("span");
      title.className = "task__title";
      title.textContent = task.title;

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.textContent = "Complete";
      completeButton.disabled = task.complete;
      completeButton.addEventListener("click", () => completeTask(task.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "task__secondary";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteTask(task.id));

      item.append(status, title, completeButton, deleteButton);
      return item;
    }),
  );
}

async function loadTasks() {
  const body = await request("/api/tasks");
  tasks = body.tasks;
  render();
}

async function addTask(title) {
  const body = await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  tasks.push(body.task);
  render();
}

async function completeTask(id) {
  const body = await request(`/api/tasks/${id}/complete`, { method: "POST" });
  tasks = tasks.map((task) => (task.id === id ? body.task : task));
  render();
}

async function deleteTask(id) {
  await request(`/api/tasks/${id}`, { method: "DELETE" });
  tasks = tasks.filter((task) => task.id !== id);
  render();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const title = input.value.trim();
  if (!title) {
    setError("Task title cannot be empty.");
    return;
  }

  form.querySelector("button").disabled = true;
  try {
    await addTask(title);
    input.value = "";
    input.focus();
  } catch (error) {
    setError(error.message);
  } finally {
    form.querySelector("button").disabled = false;
  }
});

loadTasks().catch((error) => {
  setError(error.message);
});
