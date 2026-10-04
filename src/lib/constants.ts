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

// The last default column is the done one: finishing an issue there earns XP.
export const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

const TYPE_XP: Record<IssueType, number> = { task: 20, bug: 30, story: 40 };
const PRIORITY_XP_MULTIPLIER: Record<IssuePriority, number> = {
  low: 1,
  medium: 1.5,
  high: 2,
};

/** XP the assignee earns for finishing an issue. */
export function issueXp(type: IssueType, priority: IssuePriority) {
  return Math.round(TYPE_XP[type] * PRIORITY_XP_MULTIPLIER[priority]);
}

const XP_PER_LEVEL = 100;

/** Level N takes N × 100 XP to complete, so levels start at 0, 100, 300, 600… */
export function levelProgress(xp: number) {
  let level = 1;
  let current = Math.max(0, xp);
  while (current >= level * XP_PER_LEVEL) {
    current -= level * XP_PER_LEVEL;
    level += 1;
  }
  return { level, current, needed: level * XP_PER_LEVEL };
}

export type XpGain = {
  memberName: string;
  amount: number;
  level: number;
  leveledUp: boolean;
};

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
