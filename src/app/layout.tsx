import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { listProjects } from "@/lib/queries";
import {
  THEME_MODE_COOKIE,
  THEME_PALETTE_COOKIE,
  parseTheme,
} from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jire", template: "%s · Jire" },
  description: "Lokalna tablica zadań",
};

// All data comes from the local SQLite file, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = listProjects().map((p) => ({ key: p.key, name: p.name }));
  const cookieStore = await cookies();
  const theme = parseTheme(
    cookieStore.get(THEME_MODE_COOKIE)?.value,
    cookieStore.get(THEME_PALETTE_COOKIE)?.value,
  );

  return (
    <html
      lang="pl"
      className="h-full antialiased"
      data-mode={theme.mode}
      data-palette={theme.palette}
    >
      <body className="flex h-full flex-col md:flex-row">
        <Sidebar projects={projects} theme={theme} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
