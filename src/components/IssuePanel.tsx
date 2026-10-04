"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteIssue, updateIssue } from "@/lib/actions";
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  PRIORITY_LABELS,
  TYPE_LABELS,
  issueKey,
  type IssuePriority,
  type IssueType,
} from "@/lib/constants";
import { TypeIcon } from "./IssueBadges";

type PanelIssue = {
  id: number;
  number: number;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  columnId: number;
};

export function IssuePanel({
  projectKey,
  issue,
  columns,
  createdAt,
  updatedAt,
}: {
  projectKey: string;
  issue: PanelIssue;
  columns: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [type, setType] = useState(issue.type);
  const [priority, setPriority] = useState(issue.priority);
  const [columnId, setColumnId] = useState(issue.columnId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    title.trim() !== issue.title ||
    description !== issue.description ||
    type !== issue.type ||
    priority !== issue.priority ||
    columnId !== issue.columnId;

  const close = useCallback(() => {
    if (dirty && !window.confirm("Masz niezapisane zmiany. Zamknąć bez zapisywania?")) {
      return;
    }
    router.push(`/projects/${projectKey}`);
  }, [dirty, projectKey, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateIssue(issue.id, {
        title,
        description,
        type,
        priority,
        columnId,
      });
      if (result.error) setError(result.error);
      else setTitle((current) => current.trim());
    });
  }

  function remove() {
    const key = issueKey(projectKey, issue.number);
    if (!window.confirm(`Usunąć zadanie ${key}? Tej operacji nie da się cofnąć.`)) {
      return;
    }
    startTransition(() => deleteIssue(issue.id));
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/45 p-3 md:p-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={`Zadanie ${issueKey(projectKey, issue.number)}`}
        onSubmit={save}
        className="w-full max-w-3xl rounded-xl border border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm text-muted">
          <TypeIcon type={type} />
          <span className="font-medium tabular-nums">
            {issueKey(projectKey, issue.number)}
          </span>
          <button
            type="button"
            onClick={close}
            className="btn btn-ghost -mr-2 ml-auto px-2"
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="min-w-0 space-y-4">
            <div>
              <label htmlFor="issue-title" className="label">
                Tytuł
              </label>
              <input
                id="issue-title"
                className="field text-base font-medium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div>
              <label htmlFor="issue-description" className="label">
                Opis
              </label>
              <textarea
                id="issue-description"
                className="field min-h-48 resize-y leading-relaxed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodaj opis…"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="issue-column" className="label">
                Status
              </label>
              <select
                id="issue-column"
                className="field"
                value={columnId}
                onChange={(e) => setColumnId(Number(e.target.value))}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="issue-type" className="label">
                Typ
              </label>
              <select
                id="issue-type"
                className="field"
                value={type}
                onChange={(e) => setType(e.target.value as IssueType)}
              >
                {ISSUE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="issue-priority" className="label">
                Priorytet
              </label>
              <select
                id="issue-priority"
                className="field"
                value={priority}
                onChange={(e) => setPriority(e.target.value as IssuePriority)}
              >
                {ISSUE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <dl className="space-y-1 border-t border-line pt-4 text-xs text-muted">
              <div className="flex justify-between gap-2">
                <dt>Utworzono</dt>
                <dd className="text-right tabular-nums">{createdAt}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Zmieniono</dt>
                <dd className="text-right tabular-nums">{updatedAt}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            className="btn btn-danger"
            onClick={remove}
            disabled={pending}
          >
            Usuń
          </button>
          <p role="status" className="ml-auto text-sm text-muted">
            {error ? (
              <span className="text-danger">{error}</span>
            ) : pending ? (
              "Zapisywanie…"
            ) : dirty ? (
              "Niezapisane zmiany"
            ) : (
              ""
            )}
          </p>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || !dirty || !title.trim()}
          >
            Zapisz
          </button>
        </div>
      </form>
    </div>
  );
}
