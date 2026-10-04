import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IssuePanel } from "@/components/IssuePanel";
import { issueKey as formatIssueKey } from "@/lib/constants";
import { getColumns, getIssue, getProjectByKey } from "@/lib/queries";

type Props = { params: Promise<{ key: string; issueKey: string }> };

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function loadIssue({ params }: Props) {
  const { key, issueKey } = await params;
  const project = getProjectByKey(key);
  if (!project) return null;

  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(issueKey);
  if (!match || match[1].toUpperCase() !== project.key) return null;

  const issue = getIssue(project.id, Number(match[2]));
  return issue ? { project, issue } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const loaded = await loadIssue(props);
  if (!loaded) return { title: "Nie znaleziono" };
  const { project, issue } = loaded;
  return { title: `${formatIssueKey(project.key, issue.number)} ${issue.title}` };
}

export default async function IssuePage(props: Props) {
  const loaded = await loadIssue(props);
  if (!loaded) notFound();
  const { project, issue } = loaded;

  return (
    <IssuePanel
      key={issue.id}
      projectKey={project.key}
      issue={{
        id: issue.id,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        columnId: issue.columnId,
      }}
      columns={getColumns(project.id).map((c) => ({ id: c.id, name: c.name }))}
      createdAt={dateFormat.format(issue.createdAt)}
      updatedAt={dateFormat.format(issue.updatedAt)}
    />
  );
}
