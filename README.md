# Ajaia Docs

A small collaborative document editor: create rich-text documents, import files, share them with roles, comment, and restore old versions.

- **Live app:** https://ajaia-docs-zeyad.vercel.app
- **Stack:** Next.js 16 (App Router, Server Actions), Prisma 7, Postgres on Neon, TipTap 3, Tailwind 4, Vitest
- **More:** [ARCHITECTURE.md](ARCHITECTURE.md), [AI_WORKFLOW.md](AI_WORKFLOW.md), [SUBMISSION.md](SUBMISSION.md)

## Test accounts

Sign-in is simulated: choose an account on the sign-in page, no password. Use **Switch user** in the header to change accounts.

| Account | Email | Use it to |
|---|---|---|
| Alice Chen | alice@example.com | Own documents, share them, manage access |
| Bob Martin | bob@example.com | Edit Alice's welcome doc (Can edit) |
| Carol Diaz | carol@example.com | View Alice's welcome doc read-only (Can view) |

## Features

- **Documents:** create, rename, edit, autosave, reopen. Bold, italic, underline, headings H1 to H3, bulleted and numbered lists, undo and redo.
- **Import:** `.txt`, `.md` and `.docx` up to 2 MB become a new editable document. Headings, emphasis, links and lists are kept; images and tables are dropped. Try the files in [`samples/`](samples).
- **Sharing:** the owner shares by email as *Can edit* or *Can view*, changes roles, or removes people. The dashboard separates *My documents* from *Shared with me*.
- **Export:** Markdown (`.md`) or PDF (`.pdf`) download.
- **Version history:** a snapshot at most every 5 minutes while editing; owners and editors can restore any version.
- **Comments:** everyone with access can comment (viewers included) and quote selected text; resolve and delete follow simple rules.
- **Presence:** see who else has the document open and whether they are editing.

## Run locally

Requires Node.js 20+ and a Postgres database (a free [Neon](https://neon.tech) database works).

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (and DATABASE_URL_UNPOOLED if your provider gives one)
npm run setup                # apply migrations and seed the three accounts
npm run dev                  # http://localhost:3000
```

Run `npm run setup` before the first `npm run dev`, otherwise the sign-in page has no accounts. It is safe to run again.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run setup` | Apply migrations and seed demo data |
| `npm test` | Unit and database integration tests (needs `DATABASE_URL`) |
| `npm run build` | Generate the Prisma client and build for production |

## Deployment

Vercel, with the Neon database connected through the Vercel integration. Every push to `main` deploys. New migrations are applied with `npm run db:migrate`.

## Project layout

```
prisma/                  schema, migrations, seed
src/lib/documents.ts     document queries and the access rules (canView, canEdit)
src/lib/sharing.ts       sharing rules (owner only)
src/lib/import.ts        file import (.txt, .md, .docx to editor JSON)
src/lib/versions.ts      version history
src/lib/comments.ts      comments
src/app/                 pages and server actions
src/components/          editor, dialogs, panels
tests/                   Vitest tests
```
