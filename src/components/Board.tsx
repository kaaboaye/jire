"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import {
  addColumn,
  createIssue,
  deleteColumn,
  moveColumnTo,
  moveIssue,
} from "@/lib/actions";
import { issueKey } from "@/lib/constants";
import type { BoardColumn, BoardIssue } from "@/lib/queries";
import { PriorityIcon, TypeIcon } from "./IssueBadges";

const issueDragId = (id: number) => `issue-${id}`;
const columnDropId = (id: number) => `column-${id}`;
const columnSortId = (id: number) => `sort-column-${id}`;
const isColumnSortId = (id: UniqueIdentifier) =>
  String(id).startsWith("sort-column-");

// A dragged column only targets other columns, picked by horizontal distance
// alone because columns differ in height. Cards never see the column
// sortables, so they keep targeting cards and column drop areas.
const collisionDetection: CollisionDetection = (args) => {
  const draggingColumn = isColumnSortId(args.active.id);
  const droppableContainers = args.droppableContainers.filter(
    (container) => isColumnSortId(container.id) === draggingColumn,
  );
  if (!draggingColumn) return closestCorners({ ...args, droppableContainers });

  const center = args.collisionRect.left + args.collisionRect.width / 2;
  return droppableContainers
    .flatMap((droppableContainer) => {
      const rect = args.droppableRects.get(droppableContainer.id);
      if (!rect) return [];
      const value = Math.abs(rect.left + rect.width / 2 - center);
      return [{ id: droppableContainer.id, data: { droppableContainer, value } }];
    })
    .sort((a, b) => a.data.value - b.data.value);
};

// Arrow keys carry a picked-up column exactly one column over.
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context: { collisionRect, droppableContainers, droppableRects } },
) => {
  const direction =
    event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!direction || !collisionRect) return undefined;
  event.preventDefault();

  const [next] = droppableContainers
    .getEnabled()
    .filter((container) => isColumnSortId(container.id))
    .flatMap((container) => droppableRects.get(container.id)?.left ?? [])
    .filter((left) => (left - collisionRect.left) * direction > 1)
    .sort((a, b) => (a - b) * direction);
  return next === undefined ? undefined : { ...currentCoordinates, x: next };
};

function locate(columns: BoardColumn[], issueId: number) {
  for (const column of columns) {
    const index = column.issues.findIndex((issue) => issue.id === issueId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return null;
}

export function Board({
  projectId,
  projectKey,
  columns: serverColumns,
}: {
  projectId: number;
  projectKey: string;
  columns: BoardColumn[];
}) {
  const dndId = useId();
  const columnHelpId = useId();
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
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);

  // A small drag threshold keeps plain clicks working as "open issue". The
  // keyboard sensor only reaches column headings: cards handle their own keys.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
      scrollBehavior: "auto",
    }),
  );

  function describe(id: UniqueIdentifier) {
    const column = columns.find(
      (c) => columnSortId(c.id) === id || columnDropId(c.id) === id,
    );
    if (column) return `kolumna ${column.name}`;
    const issue = columnOf(id)?.issues.find((i) => issueDragId(i.id) === id);
    return issue ? `zadanie ${issueKey(projectKey, issue.number)}` : "element";
  }

  // Where the dragged thing would land: a slot for columns, a target for cards.
  function describeTarget(id: UniqueIdentifier) {
    const index = columns.findIndex((c) => columnSortId(c.id) === id);
    return index >= 0
      ? `pozycja ${index + 1} z ${columns.length}`
      : `nad: ${describe(id)}`;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Podniesiono: ${describe(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Przenoszenie: ${describe(active.id)}, ${describeTarget(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Upuszczono: ${describe(active.id)}, ${describeTarget(over.id)}.`
        : `Upuszczono: ${describe(active.id)}.`,
    onDragCancel: ({ active }) => `Anulowano przenoszenie: ${describe(active.id)}.`,
  };

  function columnOf(id: UniqueIdentifier) {
    return columns.find(
      (column) =>
        columnDropId(column.id) === id ||
        column.issues.some((issue) => issueDragId(issue.id) === id),
    );
  }

  function handleDragStart({ active }: DragStartEvent) {
    if (isColumnSortId(active.id)) {
      setActiveColumn(
        columns.find((column) => columnSortId(column.id) === active.id) ?? null,
      );
      return;
    }
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
    if (activeColumn) {
      setActiveColumn(null);
      const from = columns.findIndex((c) => c.id === activeColumn.id);
      const to = columns.findIndex((c) => columnSortId(c.id) === over?.id);
      if (from < 0 || to < 0 || from === to) return;
      setColumns((current) => arrayMove(current, from, to));
      startTransition(() => moveColumnTo(activeColumn.id, to));
      return;
    }

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
    setActiveColumn(null);
    setColumns(serverColumns);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4 md:p-6">
        <SortableContext
          items={columns.map((column) => columnSortId(column.id))}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <BoardColumnView
              key={column.id}
              column={column}
              projectKey={projectKey}
              fallbackName={columns.find((c) => c.id !== column.id)?.name}
              helpId={columnHelpId}
            />
          ))}
        </SortableContext>
        <AddColumn projectId={projectId} />
      </div>
      <p id={columnHelpId} hidden>
        Aby przestawić kolumnę, naciśnij spację, strzałkami w lewo i w prawo wybierz
        nowe miejsce i ponownie naciśnij spację. Escape anuluje.
      </p>
      <DragOverlay>
        {activeIssue && (
          <IssueCardBody issue={activeIssue} projectKey={projectKey} dragging />
        )}
        {activeColumn && (
          <ColumnOverlay column={activeColumn} projectKey={projectKey} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

const COLUMN_CLASS = "flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-surface-2";
const COLUMN_HEADING_CLASS =
  "flex items-center gap-2 px-3 pt-3 pb-2 text-xs font-semibold tracking-wide text-muted uppercase select-none";

function ColumnTitle({ column }: { column: BoardColumn }) {
  return (
    <>
      <span className="truncate">{column.name}</span>
      <span className="rounded-full bg-bg px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
        {column.issues.length}
      </span>
    </>
  );
}

function BoardColumnView({
  column,
  projectKey,
  fallbackName,
  helpId,
}: {
  column: BoardColumn;
  projectKey: string;
  /** Column that takes over the issues on delete; missing for the last one. */
  fallbackName?: string;
  /** Element describing how to reorder columns with the keyboard. */
  helpId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: columnDropId(column.id),
  });
  // The whole column moves, but only its heading starts the drag.
  const {
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnSortId(column.id) });

  function remove() {
    const message =
      column.issues.length > 0 && fallbackName
        ? `Usunąć kolumnę „${column.name}”? Jej zadania (${column.issues.length}) trafią do kolumny „${fallbackName}”.`
        : `Usunąć kolumnę „${column.name}”?`;
    if (!window.confirm(message)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteColumn(column.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={column.name}
      className={`${COLUMN_CLASS} ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start">
        <h2 className="min-w-0 flex-1">
          <span
            ref={setActivatorNodeRef}
            role="button"
            tabIndex={0}
            aria-roledescription="przestawiana kolumna"
            aria-describedby={helpId}
            className={`${COLUMN_HEADING_CLASS} cursor-grab rounded-tl-xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset`}
            {...listeners}
          >
            <ColumnTitle column={column} />
          </span>
        </h2>
        <button
          type="button"
          className="btn btn-ghost mt-1.5 mr-1.5 size-7 p-0"
          aria-label={`Usuń kolumnę ${column.name}`}
          title="Usuń kolumnę"
          disabled={pending || !fallbackName}
          onClick={remove}
        >
          ×
        </button>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-1 text-xs text-danger">
          {error}
        </p>
      )}

      <SortableContext
        items={column.issues.map((issue) => issueDragId(issue.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setDropRef}
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

// Static copy of a column that follows the pointer while it is dragged.
function ColumnOverlay({
  column,
  projectKey,
}: {
  column: BoardColumn;
  projectKey: string;
}) {
  return (
    <section aria-hidden className={`${COLUMN_CLASS} cursor-grabbing shadow-lg`}>
      <h2 className={COLUMN_HEADING_CLASS}>
        <ColumnTitle column={column} />
      </h2>
      <ul className="flex min-h-16 flex-1 flex-col gap-2 overflow-hidden px-2 py-1">
        {column.issues.map((issue) => (
          <li key={issue.id}>
            <IssueCardBody issue={issue} projectKey={projectKey} />
          </li>
        ))}
      </ul>
      <div className="btn btn-ghost m-2 justify-start">
        <span aria-hidden>+</span> Dodaj zadanie
      </div>
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

function AddColumn({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setName("");
    setError(null);
  }

  function submit() {
    if (!name.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await addColumn(projectId, name);
      if (result.error) setError(result.error);
      else close();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost w-72 shrink-0 justify-start rounded-xl border border-dashed border-line py-3"
      >
        <span aria-hidden>+</span> Dodaj kolumnę
      </button>
    );
  }

  return (
    <form
      className="w-72 shrink-0 rounded-xl bg-surface-2 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        placeholder="Nazwa nowej kolumny"
        aria-label="Nazwa nowej kolumny"
        maxLength={80}
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
          disabled={pending || !name.trim()}
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
