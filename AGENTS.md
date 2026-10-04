# Agent instructions

Jire is a local Jira clone (Next.js + TypeScript + SQLite). The project overview and
structure are in [README.md](README.md). Docs for the installed Next.js version live in
`node_modules/next/dist/docs` — read those instead of relying on memory.

Jire is a demo project. Build the simplest thing that does what was asked: no extra
tables, abstractions or screens "for later". If a sturdier design looks worth its cost,
say so and ask before building it.

## Language

Everything written to the repository is in English: docs, code comments, commit
messages, branch names, PR titles and descriptions. The app's user interface is in
Polish; keep UI strings in Polish.

## Required workflow

Every code change goes through the steps below, in this order. A task is not finished
until all of them are done.

There are two levels of rigour:

- **Standard** is the default.
- **Full** applies only when the user asks for it (for example "full verification").

Each step says what the full level adds. A change that cannot affect the running app
(docs, agent configuration) needs only step 1 and a PR without screenshots.

### 1. Static checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

All three must pass without errors.

### 2. Verify in the browser

Once the code is written, start the app and click through it in a real browser. Code
that compiles proves nothing.

Tools:

- Start the dev server from `.claude/launch.json` (`jire`). It may not get port 3000:
  when another session already holds it, the server starts on a free port. Use the
  port it reports.
- Drive the browser with Playwright, from the first step. The desktop app's built-in
  browser pane cannot drag cards on the board and cannot save full-size screenshots,
  so starting there means doing the work twice.
- Keep Playwright scripts short: one flow per script, returning what it observed. A
  long script that fails halfway loses everything it collected.

Standard level:

- Walk the whole flow the change touches, start to finish.
- Confirm changes are actually persisted: reload the page and check the state survived.
- Check the empty states and validation errors of what you changed.
- The browser console and the server logs must be free of errors and warnings.
- Check the changed views at three viewport sizes: desktop (1440×900), tablet
  (768×1024) and mobile (375×812). None of them may scroll the whole page horizontally.

The full level adds:

- The neighbouring flows the change could have broken (board, dragging cards, issue
  panel, project settings, creating and deleting a project).
- More edge cases: long text, URLs that do not exist.
- UI/UX: nothing is misaligned, overlapping or clipped; hover, focus, disabled and
  loading states look right; both light and dark themes.
- Accessibility (a11y): everything is operable by keyboard, focus is visible, fields
  have labels, icon-only buttons have an accessible name, contrast is sufficient, error
  messages are announced (`role="alert"`).

Fix whatever you find and verify again. Clean up any test data you created while
clicking around.

### 3. Independent code review (full level only)

Only after the browser confirms everything works, get a code review from someone who
does not share your reasoning: a separate agent with a fresh context. Give it the diff
and the goal of the change, not your conclusions or an assurance that "it works".

Verify and fix every problem it reports. If you believe a finding is wrong, say why in
the PR. After the fixes, go back to steps 1 and 2 for everything they touched.

### 4. Pull request with screenshots

Changes reach `main` through a PR from a separate branch. The PR must include
screenshots at three viewport sizes: desktop, tablet and mobile. Capture only the views
the change touched, not every view in the app.

1. Take the screenshots from the final code (after the review fixes), not an earlier
   state.
2. Look at every screenshot before attaching it. If something looks wrong, fix it and
   retake the screenshots — never attach an image that shows a defect.
3. Save them in `.github/screenshots/<branch-name>/` as `desktop.png`, `tablet.png` and
   `mobile.png` (for several views: `<view>-desktop.png` and so on) and commit them on
   the PR branch.
4. Embed them in the PR description, linking to a specific commit so the images survive
   the branch being deleted:

   ```markdown
   ![desktop](https://github.com/kaaboaye/jire/blob/<sha>/.github/screenshots/<branch>/desktop.png?raw=true)
   ```

5. After opening the PR, open it on GitHub and make sure the images render.

The PR description also covers: what changed and why, which level was used, what was
verified in the browser, and — at the full level — the outcome of the code review (what
was found and what was fixed).
