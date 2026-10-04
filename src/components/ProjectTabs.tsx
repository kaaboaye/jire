"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ projectKey }: { projectKey: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectKey}`;
  const onSettings = pathname.startsWith(`${base}/settings`);

  const tabs = [
    { href: base, label: "Tablica", active: !onSettings },
    { href: `${base}/settings`, label: "Ustawienia", active: onSettings },
  ];

  return (
    <nav className="mt-3 flex gap-5" aria-label="Widoki projektu">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
            tab.active
              ? "border-accent font-medium text-fg"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
