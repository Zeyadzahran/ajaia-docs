# Ajaia Docs

A lightweight collaborative document editor: create, edit and share rich-text documents.

- **Live:** https://ajaia-docs-zeyad.vercel.app
- **Stack:** Next.js 16 (App Router, Server Actions) · Prisma 7 · Postgres (Neon) · TipTap · Tailwind

## Test accounts

Sign-in is mocked: pick a seeded user on the sign-in page (no passwords).

| User | Email | Has |
|---|---|---|
| Alice Chen | alice@example.com | Owns "Welcome to Ajaia Docs", shared with Bob |
| Bob Martin | bob@example.com | Sees Alice's doc under *Shared with me* |
| Carol Diaz | carol@example.com | No documents; use her to check access is denied |

## Run locally

Requirements: Node.js 20+ and a Postgres database (a free [Neon](https://neon.tech) database works).

```bash
npm install
cp .env.example .env.local   # then set DATABASE_URL (and DATABASE_URL_UNPOOLED if your provider has one)
npm run setup                # applies migrations and seeds the demo users
npm run dev                  # http://localhost:3000
```

`npm run setup` must run before the first `npm run dev`: without the tables and seeded users the sign-in page has nobody to sign in as. It is safe to run again; the seed upserts by fixed ids.

If the project is linked to Vercel, `npx vercel env pull .env.local` fills in the database URLs.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run setup` | `db:migrate` + `db:seed` |
| `npm run db:migrate` | Apply Prisma migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Seed demo users and the shared welcome doc |
| `npm run build` | Generate the Prisma client and build for production |
| `npm test` | Run the automated tests |

## Project layout

```
prisma/schema.prisma     data model: users, documents, document_shares
prisma/seed.ts           demo users + shared welcome doc
src/lib/documents.ts     all document queries; access rule lives in canAccess()
src/lib/session.ts       mocked sign-in (cookie holds the user id)
src/app/                 pages and server actions
```
