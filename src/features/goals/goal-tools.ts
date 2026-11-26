import type { WorkspaceGoal } from "../workspace/services/workspace-api";
export const GOAL_UNITS = [
  "palavras",
  "caracteres",
  "capítulos",
  "páginas",
  "cenas",
  "minutos",
  "horas",
  "itens",
] as const;
export function toggleGoal(goal: WorkspaceGoal): WorkspaceGoal {
  const completed = !goal.completed;
  return {
    ...goal,
    completed,
    current: completed
      ? goal.target
      : Math.min(goal.current, Math.max(0, goal.target - 1)),
  };
}
export function justCompleted(
  previous: WorkspaceGoal | undefined,
  next: WorkspaceGoal,
) {
  return !previous?.completed && Boolean(next.completed);
}
