# AI log (working notes)

Raw notes kept while building; the final summary goes in `AI_WORKFLOW.md`.
Tool: Claude Code (Claude Opus) in the terminal, plus its built-in browser for manual checks.

## Setup
- Asked Claude to scaffold Next.js, create the GitHub repo, a new Vercel project and a Neon Postgres database. I picked Vercel + Neon (free, no card, one-click env wiring) and Frankfurt as the region (closest to me, functions pinned to the same region).
- Claude kept the setup away from my existing Vercel project and ignored the agent-tooling folders the Vercel/Prisma CLIs dropped into the repo.

## Users and dashboard (PR: feat/users-dashboard)
- Claude first wrote the data layer in raw SQL because it misread my question about Prisma. I rejected that and asked for Prisma: typed models, versioned migrations, and it is what I use day to day. The hand-made tables were dropped and recreated by `prisma migrate dev`.
- Claude noticed npm's `latest` tag for Prisma points at an 8.0 release candidate; we pinned the stable 7.10.1 instead of building on an RC under a deadline.
- The Next.js 16 template turns on `cacheComponents`, which raised dev errors on every page because all pages read the session cookie. Every page here is per-user, so we turned it off rather than wrapping each page in Suspense.
- My review of PR #1 found two gaps Claude had missed: the README was still the Next.js template (a fresh database would leave sign-in with no users), and the seed matched the welcome doc by title, so renaming it and re-seeding would duplicate it. Fixed with setup scripts + README steps, and a fixed-id `upsert`; ran the seed twice to confirm one doc.
- Verified (PR #1) by hand in the browser: signed-out users are sent to /login; Bob sees Alice's shared doc under "Shared with me"; creating a doc lands in "My documents"; Carol gets a 404 on Bob's doc URL and on a malformed id. `npm run build`, `tsc` and `eslint` pass.

## Editor (PR: feat/editor)
- Decisions I made before any code: autosave instead of a Save button, Server Actions instead of API routes, people a doc is shared with can edit it (only the owner will manage sharing), last write wins (no real-time), a few lines of CSS instead of a typography plugin.
- Browser testing caught three bugs in the first version Claude wrote:
  1. The toolbar never appeared. TipTap's `useEditorState` is created with a null editor and is not told when the editor arrives. Fix: mount the toolbar only once the editor exists.
  2. Saving failed with "Cannot access toStringTag on the server": the editor's JSON object did not survive the server-action serialization into Prisma. Fix: send it as a JSON string and parse and validate it on the server.
  3. Clicking toolbar buttons moved the cursor, so text landed in the wrong place. Fix: `preventDefault` on mousedown so focus stays in the editor.
- Saves are queued so an older save can never overwrite a newer one. Typing during a save keeps the status at "Unsaved changes".
- Verified by hand: H1/H2, bold, bulleted and numbered lists come back identical after a reload; an empty title is rejected and the old one restored; a rename shows on the dashboard; Bob's edit to Alice's shared doc reached the database. Test data was cleaned up afterwards.
- My review of PR #2 found two more issues: a slow rename reply could overwrite newer typing in the title field, and the content check only looked at the outer shape, so JSON the editor can't load (e.g. `content: [null]`, unknown node types) could be saved and would then open as an empty doc. Fixes: only the latest rename reply updates the field, and the server now validates against the editor's own ProseMirror schema (extensions shared in `src/lib/editor-schema.ts`). The editor also locks itself if stored content ever fails to load, so an autosave can't wipe it.
- The first unit tests (`tests/validation.test.ts`) caught one more gap right away: a valid non-doc root (a bare paragraph) passed. Fixed by checking the root is the doc node.
- Retesting found the autosave timer was never reset after firing, so leaving the page always re-saved, which overwrote a DB restore with stale content. Fixed.

## Sharing with roles (PR: feat/sharing)
- Split the remaining work with a second AI agent (Codex) on file import/export in its own git worktree and branch, so the two agents never edited the same checkout. I wrote its brief with exact file boundaries to keep merge conflicts small.
- Decisions: share by the email of an existing user (no invites), only the owner manages sharing (checked on the server, not just hidden in the UI), roles Viewer / Editor (stretch goal) with a separate `canEdit` rule used for every write, re-sharing with the same person changes the role instead of erroring.
- Added an integration test against the real database (`tests/access.test.ts`): no access without a share, viewer can read but not write, editor can write, non-owners can't manage sharing, bad input and self-sharing are rejected, removing a share removes access.
- Browser check: unknown email shows "No user with the email …"; Carol added as viewer gets a read-only page (no toolbar, no title editing, no Share button); dashboards show "Can view / Can edit" and "Shared with N people".
- After the migration the running dev server still held the old Prisma client and crashed on the new `role` field; restarting it fixed that (no code change).
- While reviewing the import/export PR from Codex, its Markdown export saved files as "Ajaia Docs.md". Root cause was mine (PR #2): the doc page rendered its own <title> next to the layout metadata title, and the browser used the first one. Fixed with `generateMetadata` plus a `cache()`-shared document lookup.
- Review of PR #3 caught a P1: if the test setup failed, `afterAll` ran `deleteMany({ where: { id: undefined } })`, which Prisma turns into "delete every document". The same pattern hid in `removeShare` (an undefined userId from a forged request would remove every share on the doc). Fixed both: delete by unique id only when it exists, validate userId, and `canView`/`canEdit` now throw on an empty user id. Added a test for it.

## Version history + presence (PR: feat/history-presence)
- Before coding I cut the plan to the simplest version that still meets the stretch goals: no version preview (each entry shows a text excerpt), and no "someone else edited, reload" banner.
- One shared migration (PR #5) created the tables for versions, presence and comments, so Codex could build comments in parallel without two branches running competing migrations against the shared DB.
- History: autosave keeps at most one snapshot every 5 minutes. Restore (owner and editors) first snapshots the current state, so a restore can be undone.
- Presence: a 10 s heartbeat over a server action, "here" = seen in the last 30 s, "editing" = typed in the last 15 s. Polling instead of websockets because Vercel serverless functions can't hold sockets and the goal was an indicator, not live co-editing.
- My first history test was wrong: it passed a fake future "now" while the DB stamped versions with the real time. Rewrote it to backdate the stored version instead, and removed the `now` parameter from the code.
- Verified in the browser: Carol sees "Bob is editing" (Bob's heartbeat simulated in the DB), the history list and empty state, and no Restore button as a viewer; Alice restored an older version and the editor reloaded with it. Test data removed afterwards. `npm test`: 30 passed.
- Review of PR #6 found two race conditions: a restore read the current text before its transaction, so a save landing in between was replaced without being backed up; and two saves could both pass the "snapshot due?" check and create two versions. Fixed by taking a Postgres row lock on the document (`SELECT … FOR UPDATE`) inside one interactive transaction for both snapshot and restore. Saves, snapshots and restores on a document now run one at a time and each re-reads the latest state. The new "3 simultaneous snapshots → 1 version" test fails on the old code and passes on the new. The "edit racing a restore is never lost" test passes on both, because the timing doesn't reproduce the race reliably; it guards the property rather than proving the fix.
