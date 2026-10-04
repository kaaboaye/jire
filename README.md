# Jire

Lokalny klon Jiry: projekty z tablicami Kanban, bez użytkowników i logowania.

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja działa pod http://localhost:3000. Baza SQLite powstaje sama przy
pierwszym uruchomieniu w `data/jire.db` (plik jest poza gitem).

`npm run db:seed` dodaje projekt demo, jeśli baza jest pusta.

## Co jest w środku

- **Projekty** z własnym kluczem (np. `SKL`) i numeracją zadań (`SKL-1`, `SKL-2`…).
- **Tablica** z kolumnami; karty przeciąga się między kolumnami i w obrębie kolumny.
- **Zadanie** ma tytuł, opis, typ (Task / Bug / Story), priorytet i status (kolumnę);
  otwiera się nad tablicą pod własnym adresem, np. `/projects/SKL/issues/SKL-1`.
- **Ustawienia projektu**: nazwa i opis, edycja kolumn, usunięcie projektu.

## Struktura

- `src/db` – schemat (Drizzle), połączenie z SQLite, dane przykładowe.
- `src/lib/queries.ts` – odczyty, `src/lib/actions.ts` – zapisy (Server Actions).
- `src/app` – strony, `src/components` – komponenty interfejsu.
- `drizzle/` – migracje; po zmianie schematu: `npm run db:generate`
  (migracje wykonują się same przy starcie aplikacji).
