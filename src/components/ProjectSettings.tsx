"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  addColumn,
  deleteColumn,
  deleteProject,
  moveColumn,
  renameColumn,
  setColumnDone,
  updateProject,
} from "@/lib/actions";

export function ProjectDetailsForm({
  projectId,
  name: savedName,
  description: savedDescription,
}: {
  projectId: number;
  name: string;
  description: string;
}) {
  const [name, setName] = useState(savedName);
  const [description, setDescription] = useState(savedDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = name.trim() !== savedName || description.trim() !== savedDescription;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProject(projectId, { name, description });
      if (result.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="settings-name" className="label">
          Nazwa
        </label>
        <input
          id="settings-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
        />
      </div>
      <div>
        <label htmlFor="settings-description" className="label">
          Opis
        </label>
        <textarea
          id="settings-description"
          className="field min-h-20 resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !dirty || !name.trim()}
        >
          {pending ? "Zapisywanie…" : "Zapisz"}
        </button>
      </div>
    </form>
  );
}

type SettingsColumn = {
  id: number;
  name: string;
  isDone: boolean;
  issueCount: number;
};

export function ColumnsEditor({
  projectId,
  columns: savedColumns,
}: {
  projectId: number;
  columns: SettingsColumn[];
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Ticks the checkbox right away instead of waiting for the server.
  const [columns, showDone] = useOptimistic(
    savedColumns,
    (current, change: { id: number; isDone: boolean }) =>
      current.map((c) => (c.id === change.id ? { ...c, isDone: change.isDone } : c)),
  );

  function toggleDone(column: SettingsColumn, isDone: boolean) {
    setError(null);
    startTransition(async () => {
      showDone({ id: column.id, isDone });
      const result = await setColumnDone(column.id, isDone);
      if (result.error) setError(result.error);
    });
  }

  function run(action: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  function rename(column: SettingsColumn, value: string) {
    if (value.trim() === column.name) return;
    run(() => renameColumn(column.id, value));
  }

  function remove(column: SettingsColumn) {
    const fallback = columns.find((c) => c.id !== column.id);
    const message =
      column.issueCount > 0 && fallback
        ? `Usunąć kolumnę „${column.name}”? Jej zadania (${column.issueCount}) trafią do kolumny „${fallback.name}”.`
        : `Usunąć kolumnę „${column.name}”?`;
    if (window.confirm(message)) run(() => deleteColumn(column.id));
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addColumn(projectId, newName);
      if (result.error) setError(result.error);
      else setNewName("");
    });
  }

  return (
    <div className="mt-4">
      <ul className="space-y-2">
        {columns.map((column, index) => (
          <li key={column.id} className="flex flex-wrap items-center gap-1.5">
            <input
              // Remounts with the saved name after a rename or a failed one.
              key={column.name}
              className="field sm:w-auto sm:min-w-0 sm:flex-1"
              defaultValue={column.name}
              aria-label={`Nazwa kolumny ${index + 1}`}
              maxLength={80}
              onBlur={(e) => rename(column, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 px-1 text-xs text-muted">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={column.isDone}
                disabled={pending}
                aria-label={`Kolumna ${column.name} jest ukończona`}
                onChange={(e) => toggleDone(column, e.target.checked)}
              />
              Ukończona
            </label>
            <span className="mr-auto w-20 shrink-0 text-right text-xs text-muted tabular-nums sm:mr-0">
              zadań: {column.issueCount}
            </span>
            <button
              type="button"
              className="btn btn-ghost px-2"
              aria-label={`Przesuń kolumnę ${column.name} wyżej`}
              title="Wyżej"
              disabled={pending || index === 0}
              onClick={() => run(() => moveColumn(column.id, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost px-2"
              aria-label={`Przesuń kolumnę ${column.name} niżej`}
              title="Niżej"
              disabled={pending || index === columns.length - 1}
              onClick={() => run(() => moveColumn(column.id, 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className="btn btn-danger px-2"
              disabled={pending || columns.length === 1}
              onClick={() => remove(column)}
            >
              Usuń
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-4 flex gap-2 border-t border-line pt-4">
        <input
          className="field"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nazwa nowej kolumny"
          aria-label="Nazwa nowej kolumny"
          maxLength={80}
        />
        <button
          type="submit"
          className="btn btn-outline"
          disabled={pending || !newName.trim()}
        >
          Dodaj kolumnę
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteProject({
  projectId,
  projectName,
  issueCount,
}: {
  projectId: number;
  projectName: string;
  issueCount: number;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    const message = `Usunąć projekt „${projectName}” i wszystkie jego zadania (${issueCount})?`;
    if (window.confirm(message)) startTransition(() => deleteProject(projectId));
  }

  return (
    <button
      type="button"
      className="btn btn-outline mt-4 border-danger/50 text-danger"
      onClick={remove}
      disabled={pending}
    >
      {pending ? "Usuwanie…" : "Usuń projekt"}
    </button>
  );
}
