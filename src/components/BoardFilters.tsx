"use client";

import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  PRIORITY_LABELS,
  TYPE_LABELS,
  issueKey,
  type IssuePriority,
  type IssueType,
} from "@/lib/constants";
import type { BoardIssue } from "@/lib/queries";

const UNASSIGNED = "none";

export type BoardFilters = {
  query: string;
  /** "" for anyone, UNASSIGNED, or a member id. */
  assignee: string;
  type: IssueType | "";
  priority: IssuePriority | "";
};

export const NO_FILTERS: BoardFilters = {
  query: "",
  assignee: "",
  type: "",
  priority: "",
};

export function hasFilters(filters: BoardFilters) {
  return (
    filters.query.trim() !== "" ||
    filters.assignee !== "" ||
    filters.type !== "" ||
    filters.priority !== ""
  );
}

// Lower case without diacritics, so that "zadan" finds "zadań".
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase();

/** The query is matched word by word against the issue key and title. */
export function matchesFilters(
  issue: BoardIssue,
  filters: BoardFilters,
  projectKey: string,
) {
  if (filters.type && issue.type !== filters.type) return false;
  if (filters.priority && issue.priority !== filters.priority) return false;
  if (filters.assignee === UNASSIGNED) {
    if (issue.assigneeId !== null) return false;
  } else if (filters.assignee && String(issue.assigneeId) !== filters.assignee) {
    return false;
  }

  const text = fold(`${issueKey(projectKey, issue.number)} ${issue.title}`);
  return fold(filters.query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}

const SELECT_CLASS = "field lg:w-auto";
const activeClass = (value: string) => (value ? "border-accent" : "");

export function BoardFilterBar({
  filters,
  onChange,
  members,
  shown,
  total,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: { id: number; name: string }[];
  /** Issues that pass the filters, out of all issues on the board. */
  shown: number;
  total: number;
}) {
  const filtering = hasFilters(filters);

  return (
    <div
      role="search"
      aria-label="Filtrowanie zadań"
      className="grid shrink-0 grid-cols-2 items-center gap-2 px-4 pt-4 sm:grid-cols-3 md:px-6 lg:flex lg:flex-wrap"
    >
      <input
        type="search"
        className={`field col-span-full lg:w-64 ${activeClass(filters.query.trim())}`}
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        placeholder="Szukaj zadań"
        aria-label="Szukaj zadań"
      />
      <select
        className={`${SELECT_CLASS} ${activeClass(filters.assignee)}`}
        value={filters.assignee}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        aria-label="Osoba"
      >
        <option value="">Każda osoba</option>
        <option value={UNASSIGNED}>Nieprzypisane</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} ${activeClass(filters.type)}`}
        value={filters.type}
        onChange={(e) =>
          onChange({ ...filters, type: e.target.value as IssueType | "" })
        }
        aria-label="Typ"
      >
        <option value="">Każdy typ</option>
        {ISSUE_TYPES.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} ${activeClass(filters.priority)}`}
        value={filters.priority}
        onChange={(e) =>
          onChange({ ...filters, priority: e.target.value as IssuePriority | "" })
        }
        aria-label="Priorytet"
      >
        <option value="">Każdy priorytet</option>
        {ISSUE_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
      {filtering && (
        <button
          type="button"
          className="btn btn-ghost justify-self-start"
          onClick={() => onChange(NO_FILTERS)}
        >
          Wyczyść filtry
        </button>
      )}
      {/* Always rendered so changes are announced; while empty it is taken
          out of the grid so it does not open a row of its own. */}
      <p role="status" className="text-xs text-muted empty:absolute">
        {filtering &&
          (shown === 0
            ? "Żadne zadanie nie pasuje do filtrów."
            : `Pokazano ${shown} z ${total}`)}
      </p>
    </div>
  );
}
