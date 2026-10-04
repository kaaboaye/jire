// Fills an empty database with one demo project: `npm run db:seed`.
import { getDb } from "./index";
import { eq } from "drizzle-orm";
import { columns, issues, projects } from "./schema";

const db = getDb();

if (db.select().from(projects).all().length > 0) {
  console.log("Baza zawiera już projekty, pomijam dane przykładowe.");
  process.exit(0);
}

const demo: Record<
  string,
  { title: string; type?: "task" | "bug" | "story"; priority?: "low" | "medium" | "high" }[]
> = {
  "To Do": [
    { title: "Filtrowanie zadań po typie i priorytecie", type: "story" },
    { title: "Skróty klawiszowe na tablicy", priority: "low" },
    { title: "Długie tytuły wychodzą poza kartę na wąskim ekranie", type: "bug", priority: "high" },
  ],
  "In Progress": [
    { title: "Panel szczegółów zadania", type: "story", priority: "high" },
    { title: "Edycja kolumn w ustawieniach projektu" },
  ],
  Done: [
    { title: "Przeciąganie kart między kolumnami", type: "story" },
    { title: "Schemat bazy i migracje" },
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

  let number = 1;
  Object.entries(demo).forEach(([name, items], position) => {
    const column = tx
      .insert(columns)
      .values({ projectId: project.id, name, position })
      .returning({ id: columns.id })
      .get();
    items.forEach((item, index) => {
      tx.insert(issues)
        .values({
          projectId: project.id,
          columnId: column.id,
          number: number++,
          title: item.title,
          type: item.type ?? "task",
          priority: item.priority ?? "medium",
          position: index,
        })
        .run();
    });
  });

  tx.update(projects)
    .set({ nextIssueNumber: number })
    .where(eq(projects.id, project.id))
    .run();
});

console.log("Dodano projekt demo (DEMO).");
