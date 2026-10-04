import type { Metadata } from "next";
import { NewProjectForm } from "@/components/NewProjectForm";

export const metadata: Metadata = { title: "Nowy projekt" };

export default function NewProjectPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-4 py-8 md:px-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Nowy projekt</h1>
        <p className="mt-1 text-sm text-muted">
          Projekt dostanie na start kolumny To Do, In Progress i Done. Zadania
          ukończone w kolumnie Done dają XP przypisanym osobom.
        </p>
        <NewProjectForm />
      </div>
    </div>
  );
}
