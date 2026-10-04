import { notFound } from "next/navigation";
import {
  ColumnsEditor,
  DeleteProject,
  ProjectDetailsForm,
} from "@/components/ProjectSettings";
import { getBoard, getProjectByKey } from "@/lib/queries";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  const columns = getBoard(project.id).map((column) => ({
    id: column.id,
    name: column.name,
    isDone: column.isDone,
    issueCount: column.issues.length,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Projekt</h2>
          <ProjectDetailsForm
            key={`${project.name}\n${project.description}`}
            projectId={project.id}
            name={project.name}
            description={project.description}
          />
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Kolumny</h2>
          <p className="mt-1 text-sm text-muted">
            Kolejność na liście to kolejność kolumn na tablicy, od lewej. Zadanie
            w kolumnie oznaczonej jako ukończona daje XP przypisanej osobie.
          </p>
          <ColumnsEditor projectId={project.id} columns={columns} />
        </section>

        <section className="rounded-xl border border-danger/40 bg-surface p-5">
          <h2 className="font-semibold">Usuwanie projektu</h2>
          <p className="mt-1 text-sm text-muted">
            Usuwa projekt razem ze wszystkimi kolumnami i zadaniami. Tej operacji
            nie da się cofnąć.
          </p>
          <DeleteProject
            projectId={project.id}
            projectName={project.name}
            issueCount={columns.reduce((sum, c) => sum + c.issueCount, 0)}
          />
        </section>
      </div>
    </div>
  );
}
