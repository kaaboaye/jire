# Jire

A local Jira clone: projects with Kanban boards, no users and no login.

## Running

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000. The SQLite database is created automatically on
first start in `data/jire.db` (the file is not tracked by git).

`npm run db:seed` adds a demo project if the database is empty.

## What's inside

- **Projects** with their own key (e.g. `SKL`) and issue numbering (`SKL-1`, `SKL-2`…).
- **Board** with columns; cards can be dragged between columns and within a column.
  Columns are reordered by dragging their header, added with the button at the end of
  the board, and deleted with the × in their header.
- **Issue** with a title, description, type (Task / Bug / Story), priority and status
  (its column); it opens on top of the board at its own URL, e.g.
  `/projects/SKL/issues/SKL-1`.
- **Project settings**: name and description, column editing, deleting the project.
- **Themes**: the "Motyw" button in the sidebar switches the mode (system / light /
  dark) and one of five colour palettes. The choice is stored in cookies, so it is
  per browser.

The user interface is in Polish.

## Structure

- `src/db` – schema (Drizzle), SQLite connection, seed data.
- `src/lib/queries.ts` – reads, `src/lib/actions.ts` – writes (Server Actions).
- `src/lib/theme.ts` – theme modes and palettes; the colours themselves are CSS
  variables in `src/app/globals.css`.
- `src/app` – pages, `src/components` – UI components.
- `drizzle/` – migrations; after changing the schema run `npm run db:generate`
  (migrations are applied automatically when the app starts).

## Contributing

The required workflow for every change is described in [AGENTS.md](AGENTS.md).
