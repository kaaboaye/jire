import { notFound } from "next/navigation";
import { Board } from "@/components/Board";
import { getBoard, getProjectByKey } from "@/lib/queries";

// The board lives in a layout so it stays mounted while an issue opens on top
// of it as a nested route.
export default async function BoardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  return (
    <>
      <Board projectKey={project.key} columns={getBoard(project.id)} />
      {children}
    </>
  );
}
