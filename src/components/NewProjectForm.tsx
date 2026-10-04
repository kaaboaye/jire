"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createProject } from "@/lib/actions";
import { suggestProjectKey } from "@/lib/constants";

export function NewProjectForm() {
  const [name, setName] = useState("");
  // null means "follow the suggestion derived from the name".
  const [customKey, setCustomKey] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const key = customKey ?? suggestProjectKey(name);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProject({ name, key, description });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-5 rounded-xl border border-line bg-surface p-5"
    >
      <div>
        <label htmlFor="project-name" className="label">
          Nazwa
        </label>
        <input
          id="project-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="np. Sklep internetowy"
          maxLength={80}
          autoFocus
          required
        />
      </div>

      <div>
        <label htmlFor="project-key" className="label">
          Klucz
        </label>
        <input
          id="project-key"
          className="field w-40 font-medium uppercase"
          value={key}
          onChange={(e) =>
            setCustomKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          placeholder="SKL"
          maxLength={10}
          required
        />
        <p className="mt-1.5 text-xs text-muted">
          Prefiks numerów zadań, np. {key || "SKL"}-1. Nie da się go później zmienić.
        </p>
      </div>

      <div>
        <label htmlFor="project-description" className="label">
          Opis (opcjonalnie)
        </label>
        <textarea
          id="project-description"
          className="field min-h-20 resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link href="/" className="btn btn-ghost">
          Anuluj
        </Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Tworzenie…" : "Utwórz projekt"}
        </button>
      </div>
    </form>
  );
}
