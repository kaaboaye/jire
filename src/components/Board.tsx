"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { createIssue, moveIssue } from "@/lib/actions";
import { issueKey } from "@/lib/constants";
import type { BoardColumn, BoardIssue } from "@/lib/queries";
import { PriorityIcon, TypeIcon } from "./IssueBadges";

const issueDragId = (id: number) => `issue-${id}`;
const columnDropId = (id: number) => `column-${id}`;

function locate(columns: BoardColumn[], issueId: number) {
  for (const column of columns) {
    const index = column.issues.findIndex((issue) => issue.id === issueId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return null;
}

export function Board({
  projectKey,
  columns: serverColumns,
}: {
  projectKey: string;
  columns: BoardColumn[];
}) {
  const dndId = useId();
  const [, startTransition] = useTransition();

  // Local copy so cards move instantly while dragging; whenever the server
  // sends a fresh board it replaces the local one.
  const [columns, setColumns] = useState(serverColumns);
  const [syncedColumns, setSyncedColumns] = useState(serverColumns);
  if (syncedColumns !== serverColumns) {
    setSyncedColumns(serverColumns);
    setColumns(serverColumns);
  }

  const [activeIssue, setActiveIssue] = useState<BoardIssue | null>(null);

  // A small drag threshold keeps plain clicks working as "open issue".
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function columnOf(id: UniqueIdentifier) {
    return columns.find(
      (column) =>
        columnDropId(column.id) === id ||
        column.issues.some((issue) => issueDragId(issue.id) === id),
    );
  }

  function handleDragStart({ active }: DragStartEvent) {
    const column = columnOf(active.id);
    setActiveIssue(
      column?.issues.find((issue) => issueDragId(issue.id) === active.id) ?? null,
    );
  }

  // Moves the card into another column as soon as it hovers over it.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = columnOf(active.id);
    const to = columnOf(over.id);
    if (!from || !to || from.id === to.id) return;

    const issue = from.issues.find((i) => issueDragId(i.id) === active.id);
    if (!issue) return;
    const overIndex = to.issues.findIndex((i) => issueDragId(i.id) === over.id);
    const index = overIndex >= 0 ? overIndex : to.issues.length;

    setColumns((current) =>
      current.map((column) => {
        if (column.id === from.id) {
          return {
            ...column,
            issues: column.issues.filter((i) => i.id !== issue.id),
          };
        }
        if (column.id === to.id) {
          const rest = column.issues.filter((i) => i.id !== issue.id);
          return {
            ...column,
            issues: [...rest.slice(0, index), issue, ...rest.slice(index)],
          };
        }
        return column;
      }),
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const issue = activeIssue;
    setActiveIssue(null);
    if (!issue || !over) {
      setColumns(serverColumns);
      return;
    }

    const column = columnOf(active.id);
    if (!column) return;

    let index = column.issues.findIndex((i) => i.id === issue.id);
    const overIndex = column.issues.findIndex(
      (i) => issueDragId(i.id) === over.id,
    );
    if (overIndex >= 0 && overIndex !== index) {
      const reordered = arrayMove(column.issues, index, overIndex);
      setColumns((current) =>
        current.map((c) => (c.id === column.id ? { ...c, issues: reordered } : c)),
      );
      index = overIndex;
    }

    const before = locate(serverColumns, issue.id);
    if (before?.columnId === column.id && before.index === index) return;

    startTransition(() => moveIssue(issue.id, column.id, index));
  }

  function handleDragCancel() {
    setActiveIssue(null);
    setColumns(serverColumns);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4 md:p-6">
        {columns.map((column) => (
          <BoardColumnView key={column.id} column={column} projectKey={projectKey} />
        ))}
      </div>
      <DragOverlay>
        {activeIssue && (
          <IssueCardBody issue={activeIssue} projectKey={projectKey} dragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumnView({
  column,
  projectKey,
}: {
  column: BoardColumn;
  projectKey: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(column.id) });

  return (
    <section
      aria-label={column.name}
      className="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-surface-2"
    >
      <h2 className="flex items-center gap-2 px-3 pt-3 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <span className="truncate">{column.name}</span>
        <span className="rounded-full bg-bg px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
          {column.issues.length}
        </span>
      </h2>

      <SortableContext
        items={column.issues.map((issue) => issueDragId(issue.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          className={`flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto rounded-lg px-2 py-1 transition-colors ${
            isOver ? "bg-accent-soft/60" : ""
          }`}
        >
          {column.issues.map((issue) => (
            <SortableIssueCard key={issue.id} issue={issue} projectKey={projectKey} />
          ))}
        </ul>
      </SortableContext>

      <AddIssue columnId={column.id} />
    </section>
  );
}

function SortableIssueCard({
  issue,
  projectKey,
}: {
  issue: BoardIssue;
  projectKey: string;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issueDragId(issue.id) });

  const open = () =>
    router.push(`/projects/${projectKey}/issues/${issueKey(projectKey, issue.number)}`);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isDragging ? "opacity-40" : ""
      }`}
      {...attributes}
      {...listeners}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter") open();
      }}
    >
      <IssueCardBody issue={issue} projectKey={projectKey} />
    </li>
  );
}

function IssueCardBody({
  issue,
  projectKey,
  dragging = false,
}: {
  issue: BoardIssue;
  projectKey: string;
  dragging?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface p-3 transition-colors select-none hover:border-accent ${
        dragging ? "rotate-2 cursor-grabbing shadow-lg" : "cursor-pointer shadow-xs"
      }`}
    >
      <p className="text-sm leading-snug break-words">{issue.title}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <TypeIcon type={issue.type} />
        <span className="font-medium tabular-nums">
          {issueKey(projectKey, issue.number)}
        </span>
        <span className="ml-auto">
          <PriorityIcon priority={issue.priority} />
        </span>
      </div>
    </div>
  );
}

function AddIssue({ columnId }: { columnId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function close() {
    setOpen(false);
    setTitle("");
    setError(null);
  }

  function submit() {
    if (!title.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createIssue(columnId, title);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Stay open so several issues can be added in a row.
      setTitle("");
      inputRef.current?.focus();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost m-2 justify-start"
      >
        <span aria-hidden>+</span> Dodaj zadanie
      </button>
    );
  }

  return (
    <form
      className="p-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={inputRef}
        className="field resize-none"
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape") close();
        }}
        placeholder="Co trzeba zrobić?"
        aria-label="Tytuł nowego zadania"
        maxLength={200}
        autoFocus
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !title.trim()}
        >
          Dodaj
        </button>
        <button type="button" className="btn btn-ghost" onClick={close}>
          Anuluj
        </button>
      </div>
    </form>
  );
}
