export interface Task {
  id: string;
  title: string;
  archived: boolean;
}

export function createBoard(): { tasks: Task[] } {
  return { tasks: [] };
}

export function addTask(board: { tasks: Task[] }, title: string): Task {
  const task: Task = { id: `T-${board.tasks.length + 1}`, title, archived: false };
  board.tasks.push(task);
  return task;
}

export function archiveTask(board: { tasks: Task[] }, id: string): void {
  const task = board.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`unknown task ${id}`);
  task.archived = true;
}

export function listTasks(board: { tasks: Task[] }, filter: "active" | "archived" | "all" = "active"): Task[] {
  if (filter === "all") return [...board.tasks];
  if (filter === "archived") return board.tasks.filter((t) => t.archived);
  return board.tasks.filter((t) => !t.archived);
}
