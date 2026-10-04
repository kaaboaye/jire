import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectAvatar } from "@/components/ProjectAvatar";
import { ProjectTabs } from "@/components/ProjectTabs";
import { getProjectByKey } from "@/lib/queries";

type Props = {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return { title: getProjectByKey(key)?.name ?? "Nie znaleziono" };
}

export default async function ProjectLayout({ children, params }: Props) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  return (
    <>
      <header className="shrink-0 border-b border-line bg-surface px-4 pt-4 md:px-6">
        <div className="flex items-center gap-3">
          <ProjectAvatar projectKey={project.key} />
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-muted">{project.key}</p>
          </div>
        </div>
        <ProjectTabs projectKey={project.key} />
      </header>
      {children}
    </>
  );
}
