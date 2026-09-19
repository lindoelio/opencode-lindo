import { describe, expect, it } from "vitest";
import { addTask, archiveTask, createBoard, listTasks } from "./board.js";

describe("board flow (VS-001)", () => {
  it("archives a task and filters Active/Archived", () => {
    const board = createBoard();
    const a = addTask(board, "Write spec");
    addTask(board, "Ship slice");
    archiveTask(board, a.id);
    expect(listTasks(board, "active").map((t) => t.title)).toEqual(["Ship slice"]);
    expect(listTasks(board, "archived").map((t) => t.title)).toEqual(["Write spec"]);
    expect(listTasks(board, "all")).toHaveLength(2);
  });
});
