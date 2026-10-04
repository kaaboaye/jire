# Jire

A local Jira clone: projects with Kanban boards and a team that earns XP for finished
issues. There are no accounts and no login.

## Running

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000. The SQLite database is created automatically on
first start in `data/jire.db` (the file is not tracked by git).

`npm run db:seed` adds a demo project and two team members if the database is empty.

## What's inside

- **Projects** with their own key (e.g. `SKL`) and issue numbering (`SKL-1`, `SKL-2`…).
- **Board** with columns; cards can be dragged between columns and within a column.
- **Issue** with a title, description, type (Task / Bug / Story), priority, assignee and
  status (its column); it opens on top of the board at its own URL, e.g.
  `/projects/SKL/issues/SKL-1`.
- **Project settings**: name and description, column editing (including which columns
  count as done), deleting the project.
- **Team** (`/team`): people who can be assigned to issues. They are plain names, not
  accounts.
- **XP and levels**: when an issue reaches a done column its assignee earns XP based on
  the issue's type and priority; XP adds up to levels. Moving the issue back takes the
  XP away, while deleting a finished issue or its project keeps it. The rules live in
  `src/lib/constants.ts` (`issueXp`, `levelProgress`) and the ledger in `src/lib/xp.ts`.

The user interface is in Polish.

## Structure

- `src/db` – schema (Drizzle), SQLite connection, seed data.
- `src/lib/queries.ts` – reads, `src/lib/actions.ts` – writes (Server Actions).
- `src/app` – pages, `src/components` – UI components.
- `drizzle/` – migrations; after changing the schema run `npm run db:generate`
  (migrations are applied automatically when the app starts).

## Contributing

The required workflow for every change is described in [AGENTS.md](AGENTS.md).
