import {
  PRIORITY_LABELS,
  TYPE_LABELS,
  type IssuePriority,
  type IssueType,
} from "@/lib/constants";

const TYPE_STYLES: Record<IssueType, { color: string; path: string }> = {
  task: { color: "#3b82f6", path: "M4.5 8.2l2.3 2.3 4.7-5" },
  bug: { color: "#e5484d", path: "M8 4.5v4M8 11.2v.3" },
  story: { color: "#30a46c", path: "M5.5 4.5h5v7L8 9.5l-2.5 2z" },
};

export function TypeIcon({ type }: { type: IssueType }) {
  const { color, path } = TYPE_STYLES[type];
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0"
      role="img"
      aria-label={`Typ: ${TYPE_LABELS[type]}`}
    >
      <title>{TYPE_LABELS[type]}</title>
      <rect width="16" height="16" rx="3.5" fill={color} />
      <path
        d={path}
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRIORITY_STYLES: Record<IssuePriority, { color: string; path: string }> = {
  high: { color: "#e5484d", path: "M3.5 10l4.5-4.5 4.5 4.5" },
  medium: { color: "#d9822b", path: "M3.5 6h9M3.5 10h9" },
  low: { color: "#3b82f6", path: "M3.5 6l4.5 4.5L12.5 6" },
};

export function PriorityIcon({ priority }: { priority: IssuePriority }) {
  const { color, path } = PRIORITY_STYLES[priority];
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0"
      role="img"
      aria-label={`Priorytet: ${PRIORITY_LABELS[priority]}`}
    >
      <title>{`Priorytet: ${PRIORITY_LABELS[priority]}`}</title>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
