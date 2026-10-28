# AI workflow note

## Tools

- **Claude Code (Claude Opus)**: my main pair programmer in the terminal. It scaffolded the project, wrote most of the code under my direction, and used its built-in browser to click through every flow.
- **OpenAI Codex**: a second agent working in parallel on file import/export and comments, in its own git worktree and branch, from written briefs with clear file boundaries.
- **GitHub PRs** as the checkpoint: nothing reached `main` without a PR, a review pass, and my merge.

## Where AI materially sped things up

- **Setup:** repo, Vercel project, Neon database and the first deploy in about 20 minutes.
- **Boilerplate I would otherwise type by hand:** Prisma schema and migrations, server actions, the TipTap toolbar, dialogs.
- **Parallel work:** while Claude built sharing, version history and presence, Codex built import/export and comments. One shared migration landed first, so the two branches never competed on the database schema.
- **Tests:** integration tests for access rules, sharing, comments and history were written next to each feature, not at the end.

## What I changed or rejected

- **Raw SQL → Prisma.** The first data layer was raw SQL because my request was misread. I asked for Prisma (typed models, versioned migrations) and the tables were rebuilt with migrations.
- **Prisma 8 RC → 7.10.1.** npm's `latest` tag pointed at a release candidate; we pinned the stable version.
- **Review findings that sent code back:**
  - A test cleanup used `deleteMany({ id: docId })`. If setup failed, `docId` would be undefined and Prisma would delete every document. The same pattern hid in `removeShare`. Fixed, with a guard in the access helpers.
  - Two race conditions in version history (a duplicate snapshot, and an edit lost during a restore). Fixed with a Postgres row lock.
  - Content validation only checked the outer shape, so JSON the editor can't load could be saved and the doc would open empty. It now validates against the editor's own schema.
  - A slow rename reply could overwrite newer typing in the title field.
  - A non-UTF-8 text file showed the user a raw technical error.
  - The README was still the template, and the seed could duplicate the welcome doc.
- **Bugs caught by clicking through, not by reading code:** the toolbar didn't render until the first keystroke, saving failed on serialization, toolbar clicks moved the cursor, and the page title broke the export file name.
- **UI.** I judged the first UI as template-looking and asked for a design pass (one palette, shared buttons, real icons). Its first attempt used beige paper colours and a serif font, which is a common AI default, so it was replaced with neutral greys. After using the result, I moved version history from a small dialog to a side panel and changed PDF export from the print dialog to a direct download.
- **Scope.** I cut what didn't serve the brief: no version preview, no conflict banner, comments not anchored in the text.

## How I verified correctness, UX and reliability

- **Every PR:** `tsc`, `eslint`, `npm test` and `npm run build`, plus a Vercel preview deploy.
- **40 automated tests**, including integration tests against the real database. I checked that the duplicate-snapshot test fails on the old code before trusting it.
- **Manual runs in the browser** as owner, editor and viewer for each feature, including the failure paths: a wrong file type, an unknown email, an empty title, a viewer trying to edit, and a stranger opening a document URL.
- **Layout checked** at 1280, 1440 and 375 px wide.
- **Test data** created during checks was deleted afterwards.

The working log I kept while building is in `notes/ai-log.md`.
