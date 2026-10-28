# Architecture note

## What I prioritized

The brief asks for a working product slice more than a feature list, so I built in this order and shipped each step as its own PR:

1. **Core loop:** create, edit with formatting, autosave, reopen. Without this nothing else matters.
2. **Sharing with a real access rule** enforced on the server, not just hidden in the UI.
3. **File import**, because it is the most "real world" requirement (people start from existing files).
4. **Tests, docs and a live deploy.**
5. **Stretch goals**, only after the core was merged and deployed: roles, export, version history, comments, presence.

## Stack and why

| Choice | Why |
|---|---|
| Next.js 16 with Server Actions | One codebase for UI and backend; actions are typed calls with no hand-written API layer. |
| Postgres (Neon) + Prisma 7 | Relational data (users, documents, shares) with real constraints and versioned migrations. Neon is free and connects to Vercel in one step. |
| TipTap 3 (ProseMirror) | A proven rich-text engine. Building an editor from scratch is not a good use of a 4-hour box. |
| Vercel | Free, deploys on every push to `main`, with preview deploys for each PR. |

## Data model

- `users`: three seeded accounts.
- `documents`: owner, title, `content` as TipTap JSON (`jsonb`).
- `document_shares`: (document, user, role) with role `EDITOR` or `VIEWER`. The primary key is (document, user), so a person can only be shared once.
- `document_versions`, `document_presence`, `comments`: stretch features. All rows cascade when a document is deleted.

**Why JSON, not HTML:** JSON is the editor's native format, so formatting round-trips exactly, and nothing is ever injected into the page as raw HTML. Saved content is validated against the editor's own schema on the server, so content the editor can't load is rejected instead of silently opening as an empty page.

## Access rules

All document queries go through two helpers in `src/lib/documents.ts`:

- `canView(user)`: the owner, or anyone with a share.
- `canEdit(user)`: the owner, or a share with role `EDITOR`.

Reads use `canView`, every write uses `canEdit`, and only the owner can manage sharing. A document you can't open returns a 404, the same as one that doesn't exist. The rules are covered by database integration tests (`tests/access.test.ts`).

## Key decisions and trade-offs

- **Simulated sign-in.** The brief allows it, and it lets reviewers switch between the three accounts in seconds. A cookie stores the user id. This is a demo, not production auth; with real auth, only `src/lib/session.ts` would change.
- **Autosave, last write wins.** Saves run one after another per tab, so an older save never overwrites a newer one. Two people editing the same paragraph at the same moment will overwrite each other; real-time co-editing (CRDTs) was out of scope.
- **Import converts, it doesn't store files.** `.docx` goes through Mammoth and `.md` through Marked into HTML, then into editor JSON, which is validated before saving. No file storage needed.
- **Version history** keeps at most one snapshot per 5 minutes. Snapshots and restores take a row lock on the document, so concurrent saves can't create duplicates or lose text during a restore.
- **Presence and comments poll every 10 s** instead of using websockets, which Vercel functions can't hold open. Fine for indicators; not for live cursors.
- **Comments are document-level**, with an optional quote of the selected text. Anchoring them inside the text would mean changing the editor schema.

## UX

One neutral palette with a single green accent, one shared button style, real icons, and a page-sized document sheet. Viewers get a read-only page instead of a toolbar that doesn't work. The sign-in page says what each account can do, so a reviewer knows whom to pick. Mobile: the toolbar scrolls sideways and the title keeps its own line. Details in `notes/ux.md`.

## Testing

`npm test` runs 40 tests: validation, import, Markdown export, and integration tests against the real database for access rules, sharing, comments, version history and presence. Every PR was also checked by hand in the browser as the owner, an editor and a viewer.

## What I would build next (2 to 4 hours)

1. Real authentication (Auth.js with Google or email magic links) and email invites for people without an account.
2. Real-time co-editing with Yjs, which would replace "last write wins" and the polling.
3. Comments anchored to the text they refer to.
4. Version preview and a diff before restoring.
5. Dark mode.
