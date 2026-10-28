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
