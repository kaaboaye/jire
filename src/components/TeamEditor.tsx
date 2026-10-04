"use client";

import { useState, useTransition } from "react";
import { createMember, deleteMember, renameMember } from "@/lib/actions";
import { levelProgress } from "@/lib/constants";
import type { TeamMember } from "@/lib/queries";
import { MemberAvatar } from "./MemberAvatar";

export function TeamEditor({ members }: { members: TeamMember[] }) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Bumped after a rejected rename so the name fields go back to saved names.
  const [resetCount, setResetCount] = useState(0);

  function run(action: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createMember(newName);
      if (result.error) setError(result.error);
      else setNewName("");
    });
  }

  function rename(member: TeamMember, value: string) {
    if (value.trim() === member.name) return;
    setError(null);
    startTransition(async () => {
      const result = await renameMember(member.id, value);
      if (result.error) {
        setError(result.error);
        setResetCount((count) => count + 1);
      }
    });
  }

  function remove(member: TeamMember) {
    const message =
      member.xp > 0
        ? `Usunąć osobę „${member.name}”? Jej XP (${member.xp}) przepadnie, a zadania zostaną bez przypisanej osoby.`
        : `Usunąć osobę „${member.name}”? Jej zadania zostaną bez przypisanej osoby.`;
    if (window.confirm(message)) run(() => deleteMember(member.id));
  }

  return (
    <div className="mt-6">
      <form onSubmit={add} className="flex gap-2">
        <input
          className="field"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Imię i nazwisko"
          aria-label="Imię i nazwisko nowej osoby"
          maxLength={60}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !newName.trim()}
        >
          Dodaj osobę
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line px-6 py-12 text-center">
          <p className="text-base font-medium">Zespół jest jeszcze pusty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Dodaj osoby, a potem przypisuj je do zadań na tablicy, żeby zaczęły
            zbierać XP.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {members.map((member) => (
            <MemberRow
              key={`${member.id}-${resetCount}`}
              member={member}
              disabled={pending}
              onRename={(value) => rename(member, value)}
              onRemove={() => remove(member)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberRow({
  member,
  disabled,
  onRename,
  onRemove,
}: {
  member: TeamMember;
  disabled: boolean;
  onRename: (value: string) => void;
  onRemove: () => void;
}) {
  const { level, current, needed } = levelProgress(member.xp);

  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface p-4">
      <MemberAvatar name={member.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <input
            // Remounts with the saved name after a rename.
            key={member.name}
            className="field font-medium"
            defaultValue={member.name}
            aria-label={`Nazwa osoby ${member.name}`}
            maxLength={60}
            onBlur={(e) => onRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <button
            type="button"
            className="btn btn-danger px-2"
            aria-label={`Usuń osobę ${member.name}`}
            disabled={disabled}
            onClick={onRemove}
          >
            Usuń
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
          <p>
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-fg">
              Poziom {level}
            </span>
            <span className="ml-2">
              {member.xp} XP · ukończone zadania: {member.completed}
            </span>
          </p>
          <p>
            {current} / {needed} XP do poziomu {level + 1}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={`Postęp osoby ${member.name} do poziomu ${level + 1}`}
          aria-valuemin={0}
          aria-valuemax={needed}
          aria-valuenow={current}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(current / needed) * 100}%` }}
          />
        </div>
      </div>
    </li>
  );
}
