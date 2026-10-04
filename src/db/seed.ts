// Fills an empty database with one demo project: `npm run db:seed`.
import { getDb } from "./index";
import { eq } from "drizzle-orm";
import { syncIssueXp } from "../lib/xp";
import { columns, issues, members, projects } from "./schema";

const db = getDb();

if (db.select().from(projects).all().length > 0) {
  console.log("Baza zawiera już projekty, pomijam dane przykładowe.");
  process.exit(0);
}

const demo: Record<
  string,
  {
    title: string;
    type?: "task" | "bug" | "story";
    priority?: "low" | "medium" | "high";
    assignee?: string;
  }[]
> = {
  "To Do": [
    { title: "Filtrowanie zadań po typie i priorytecie", type: "story" },
    { title: "Skróty klawiszowe na tablicy", priority: "low" },
    { title: "Długie tytuły wychodzą poza kartę na wąskim ekranie", type: "bug", priority: "high" },
  ],
  "In Progress": [
    {
      title: "Panel szczegółów zadania",
      type: "story",
      priority: "high",
      assignee: "Ania Kowalska",
    },
    { title: "Edycja kolumn w ustawieniach projektu" },
  ],
  Done: [
    {
      title: "Przeciąganie kart między kolumnami",
      type: "story",
      assignee: "Ania Kowalska",
    },
    { title: "Schemat bazy i migracje", assignee: "Marek Nowak" },
  ],
};

db.transaction((tx) => {
  const project = tx
    .insert(projects)
    .values({
      key: "DEMO",
      name: "Projekt demo",
      description: "Przykładowa tablica. Możesz ją usunąć w ustawieniach projektu.",
    })
    .returning({ id: projects.id })
    .get();

  const memberIds = new Map<string, number>();
  for (const name of ["Ania Kowalska", "Marek Nowak"]) {
    const member = tx.insert(members).values({ name }).returning().get();
    memberIds.set(name, member.id);
  }

  let number = 1;
  Object.entries(demo).forEach(([name, items], position) => {
    const column = tx
      .insert(columns)
      .values({ projectId: project.id, name, position, isDone: name === "Done" })
      .returning({ id: columns.id })
      .get();
    items.forEach((item, index) => {
      const issue = tx
        .insert(issues)
        .values({
          projectId: project.id,
          columnId: column.id,
          assigneeId: item.assignee ? memberIds.get(item.assignee) : null,
          number: number++,
          title: item.title,
          type: item.type ?? "task",
          priority: item.priority ?? "medium",
          position: index,
        })
        .returning({ id: issues.id })
        .get();
      syncIssueXp(tx, issue.id);
    });
  });

  tx.update(projects)
    .set({ nextIssueNumber: number })
    .where(eq(projects.id, project.id))
    .run();
});

console.log("Dodano projekt demo (DEMO) i dwie osoby w zespole.");
