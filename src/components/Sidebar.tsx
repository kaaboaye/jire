"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectAvatar } from "./ProjectAvatar";

export function Sidebar({
  projects,
}: {
  projects: { key: string; name: string }[];
}) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-2 md:w-60 md:flex-col md:items-stretch md:gap-0 md:border-r md:border-b-0 md:px-3 md:py-4">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-base font-semibold tracking-tight"
      >
        <span
          aria-hidden
          className="flex size-6 items-end justify-center gap-0.5 rounded-md bg-accent p-1"
        >
          <span className="h-full w-1 rounded-sm bg-accent-fg" />
          <span className="h-2/3 w-1 rounded-sm bg-accent-fg/80" />
          <span className="h-1/3 w-1 rounded-sm bg-accent-fg/60" />
        </span>
        Jire
      </Link>

      <nav className="hidden min-h-0 flex-1 flex-col md:mt-6 md:flex">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Projekty
        </p>
        <ul className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
          {projects.map((project) => {
            const href = `/projects/${project.key}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={project.key}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent-soft font-medium text-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <ProjectAvatar projectKey={project.key} size="sm" />
                  <span className="truncate">{project.name}</span>
                </Link>
              </li>
            );
          })}
          {projects.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted">Brak projektów</li>
          )}
        </ul>
      </nav>

      <Link
        href="/projects/new"
        className="btn btn-outline ml-auto md:mt-3 md:ml-0"
      >
        <span aria-hidden>+</span> Nowy projekt
      </Link>
    </aside>
  );
}
