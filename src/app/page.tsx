import Link from "next/link";
import { ProjectAvatar } from "@/components/ProjectAvatar";
import { listProjects } from "@/lib/queries";

function issueCountLabel(count: number) {
  if (count === 1) return "1 zadanie";
  const lastTwo = count % 100;
  const last = count % 10;
  const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${count} ${few ? "zadania" : "zadań"}`;
}

export default function HomePage() {
  const projects = listProjects();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Projekty</h1>
          {projects.length > 0 && (
            <Link href="/projects/new" className="btn btn-primary">
              Nowy projekt
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-base font-medium">Nie masz jeszcze żadnego projektu</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Projekt to osobna tablica z własnymi kolumnami i numeracją zadań.
            </p>
            <Link href="/projects/new" className="btn btn-primary mt-6">
              Utwórz pierwszy projekt
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.key}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-center gap-3">
                    <ProjectAvatar projectKey={project.key} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="text-xs text-muted">{project.key}</p>
                    </div>
                  </div>
                  {project.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted">
                      {project.description}
                    </p>
                  )}
                  <p className="mt-auto pt-4 text-xs text-muted tabular-nums">
                    {issueCountLabel(project.issueCount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
