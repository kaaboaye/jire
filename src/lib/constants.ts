// Shared by server and client code, so it must stay free of database imports.

export const ISSUE_TYPES = ["task", "bug", "story"] as const;
export const ISSUE_PRIORITIES = ["low", "medium", "high"] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const TYPE_LABELS: Record<IssueType, string> = {
  task: "Task",
  bug: "Bug",
  story: "Story",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

export function issueKey(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

/** Suggests a project key from its name, e.g. "Sklep internetowy" -> "SI". */
export function suggestProjectKey(name: string) {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const raw =
    words.length === 1
      ? words[0].slice(0, 4)
      : words.map((w) => w[0]).join("");
  return raw.replace(/^[0-9]+/, "").slice(0, 10);
}
