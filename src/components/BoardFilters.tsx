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
import { PriorityIcon, TypeIcon } from "./IssueBadges";
import { MemberAvatar } from "./MemberAvatar";

export type BoardFilters = {
  query: string;
  /** Member ids; null stands for issues nobody is assigned to. */
  assignees: (number | null)[];
  types: IssueType[];
  priorities: IssuePriority[];
};

// An empty list means "any": a filter only narrows once something is picked.
export const NO_FILTERS: BoardFilters = {
  query: "",
  assignees: [],
  types: [],
  priorities: [],
};

export function hasFilters(filters: BoardFilters) {
  return (
    filters.query.trim() !== "" ||
    filters.assignees.length > 0 ||
    filters.types.length > 0 ||
    filters.priorities.length > 0
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
  const picked = <T,>(list: T[], value: T) => list.length === 0 || list.includes(value);
  if (
    !picked(filters.assignees, issue.assigneeId) ||
    !picked(filters.types, issue.type) ||
    !picked(filters.priorities, issue.priority)
  ) {
    return false;
  }

  const text = fold(`${issueKey(projectKey, issue.number)} ${issue.title}`);
  return fold(filters.query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-accent cursor-pointer";

function Chip({
  label,
  pressed,
  onClick,
  children,
}: {
  /** Accessible name; the visible text has to be part of it. */
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors focus-visible:outline-offset-2 ${FOCUS_CLASS} ${
        pressed
          ? "border-accent bg-accent-soft text-fg"
          : "border-line bg-surface text-muted hover:border-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

// Avatar-sized toggle: a ring marks the people the board is narrowed to.
function PersonToggle({
  name,
  pressed,
  onClick,
  children,
}: {
  name: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`Osoba: ${name}`}
      aria-pressed={pressed}
      title={name}
      onClick={onClick}
      className={`flex rounded-full ring-offset-2 ring-offset-bg transition-shadow focus-visible:outline-offset-4 ${FOCUS_CLASS} ${
        pressed ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-line"
      }`}
    >
      {children}
    </button>
  );
}

const GROUP_CLASS = "flex items-center max-sm:shrink-0 sm:flex-wrap";

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
  const toggleAssignee = (id: number | null) =>
    onChange({ ...filters, assignees: toggle(filters.assignees, id) });

  return (
    <div
      role="search"
      aria-label="Filtrowanie zadań"
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-4 md:px-6"
    >
      <div className="relative w-full sm:w-56">
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted"
          aria-hidden
        >
          <path
            d="M7 11.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM10.3 10.3l3.2 3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          className={`field h-8 rounded-full py-0 pr-3 pl-8 ${
            filters.query.trim() ? "border-accent" : ""
          }`}
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Szukaj zadań"
          aria-label="Szukaj zadań"
        />
      </div>

      {/* On phones the toggles form one strip that scrolls sideways and fades
          out at the right edge; from sm up they wrap with the rest of the bar. */}
      <div className="-mx-4 -my-1.5 flex gap-x-4 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] max-sm:mask-r-from-[calc(100%-2rem)] sm:contents">
        <div role="group" aria-label="Osoba" className={`${GROUP_CLASS} gap-2.5`}>
          {members.map((member) => (
            <PersonToggle
              key={member.id}
              name={member.name}
              pressed={filters.assignees.includes(member.id)}
              onClick={() => toggleAssignee(member.id)}
            >
              <MemberAvatar name={member.name} size="md" />
            </PersonToggle>
          ))}
          <PersonToggle
            name="Nieprzypisane"
            pressed={filters.assignees.includes(null)}
            onClick={() => toggleAssignee(null)}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-muted bg-surface text-muted">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path
                  d="M8 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 13.5c0-2.2 2-3.5 4.5-3.5s4.5 1.3 4.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </PersonToggle>
        </div>

        <div role="group" aria-label="Typ" className={`${GROUP_CLASS} gap-1.5`}>
          {ISSUE_TYPES.map((type) => (
            <Chip
              key={type}
              label={`Typ: ${TYPE_LABELS[type]}`}
              pressed={filters.types.includes(type)}
              onClick={() => onChange({ ...filters, types: toggle(filters.types, type) })}
            >
              <TypeIcon type={type} />
              {TYPE_LABELS[type]}
            </Chip>
          ))}
        </div>

        <div role="group" aria-label="Priorytet" className={`${GROUP_CLASS} gap-1.5`}>
          {ISSUE_PRIORITIES.map((priority) => (
            <Chip
              key={priority}
              label={`Priorytet: ${PRIORITY_LABELS[priority]}`}
              pressed={filters.priorities.includes(priority)}
              onClick={() =>
                onChange({ ...filters, priorities: toggle(filters.priorities, priority) })
              }
            >
              <PriorityIcon priority={priority} />
              {PRIORITY_LABELS[priority]}
            </Chip>
          ))}
        </div>

      </div>

      {/* Always rendered so changes are announced; while empty it is taken
          out of the flow so it cannot wrap onto a line of its own. */}
      <p role="status" className="text-xs text-muted empty:absolute">
        {filtering &&
          (shown === 0
            ? "Żadne zadanie nie pasuje do filtrów."
            : `Pokazano ${shown} z ${total}`)}
      </p>
      {filtering && (
        <button
          type="button"
          className="btn btn-ghost -ml-2 h-8 rounded-full px-2.5 py-0 text-xs"
          onClick={() => onChange(NO_FILTERS)}
        >
          Wyczyść filtry
        </button>
      )}
    </div>
  );
}
