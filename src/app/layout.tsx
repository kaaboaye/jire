import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { XpToastProvider } from "@/components/XpToast";
import { listProjects } from "@/lib/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jire", template: "%s · Jire" },
  description: "Lokalna tablica zadań",
};

// All data comes from the local SQLite file, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = listProjects().map((p) => ({ key: p.key, name: p.name }));

  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex h-full flex-col md:flex-row">
        <XpToastProvider>
          <Sidebar projects={projects} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        </XpToastProvider>
      </body>
    </html>
  );
}
