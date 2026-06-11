// Unit tests for the CLI's pure helpers (cli.js).
//
// The interactive readline loop and console I/O are intentionally not tested
// here (per the Phase 3 scope). What IS worth testing is the pure logic the
// REPL leans on: parsing a typed line into a command + argument, and rendering
// tasks for display. These functions have no I/O, so they test cleanly.

import { describe, expect, it } from "vitest";
import cli from "./cli.js";

const { parseLine, formatTask, formatList, dispatch } = cli;

describe("parseLine", () => {
  it("splits a command from its argument", () => {
    expect(parseLine("complete 3")).toEqual({ command: "complete", arg: "3" });
  });

  it("keeps the full remainder as the argument, including spaces", () => {
    expect(parseLine("add Buy more milk")).toEqual({
      command: "add",
      arg: "Buy more milk",
    });
  });

  it("lowercases the command but preserves argument case", () => {
    expect(parseLine("ADD Walk The Dog")).toEqual({
      command: "add",
      arg: "Walk The Dog",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseLine("   list   ")).toEqual({ command: "list", arg: "" });
  });

  it("returns an empty command for a blank line", () => {
    expect(parseLine("")).toEqual({ command: "", arg: "" });
    expect(parseLine("   ")).toEqual({ command: "", arg: "" });
  });
});

describe("formatTask", () => {
  it("marks an incomplete task with an empty checkbox", () => {
    expect(formatTask({ id: 1, title: "Wash dishes", complete: false })).toBe(
      "[ ] #1 Wash dishes",
    );
  });

  it("marks a complete task with a checked box", () => {
    expect(formatTask({ id: 2, title: "Do laundry", complete: true })).toBe(
      "[x] #2 Do laundry",
    );
  });
});

describe("formatList", () => {
  it("renders a placeholder when there are no tasks", () => {
    expect(formatList([])).toBe("No tasks yet.");
  });

  it("renders one line per task", () => {
    const out = formatList([
      { id: 1, title: "A", complete: false },
      { id: 2, title: "B", complete: true },
    ]);
    expect(out).toBe("[ ] #1 A\n[x] #2 B");
  });
});

describe("dispatch", () => {
  it("runs the mutation callback after adding a task", () => {
    const out = [];
    let mutationCount = 0;

    dispatch("add", "Persist me", (msg) => out.push(msg), {
      afterMutation: () => {
        mutationCount += 1;
      },
    });

    expect(mutationCount).toBe(1);
    expect(out[0]).toMatch(/^Added \[ \] #\d+ Persist me$/);
  });

  it("does not run the mutation callback for read-only commands", () => {
    let mutationCount = 0;

    dispatch("list", "", () => {}, {
      afterMutation: () => {
        mutationCount += 1;
      },
    });

    expect(mutationCount).toBe(0);
  });
});
