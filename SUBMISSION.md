# Submission: Ajaia Docs (Zeyad Zahran)

## Links

- **Live app:** https://ajaia-docs-zeyad.vercel.app
- **Walkthrough video:** see `VIDEO_LINK.txt`
- **Source:** this folder (also on GitHub: https://github.com/Zeyadzahran/ajaia-docs)

## Test accounts

No passwords. Pick an account on the sign-in page; use **Switch user** to change.

- **Alice** (alice@example.com): owns "Welcome to Ajaia Docs" and manages sharing
- **Bob** (bob@example.com): can edit Alice's doc
- **Carol** (carol@example.com): can only view Alice's doc

## What's included

| File / folder | Contents |
|---|---|
| `README.md` | Features, local setup and run instructions, scripts |
| `ARCHITECTURE.md` | What I prioritized, data model, access rules, trade-offs, next steps |
| `AI_WORKFLOW.md` | AI tools used, what they sped up, what I changed or rejected, how I verified |
| `SUBMISSION.md` | This file |
| `VIDEO_LINK.txt` | Walkthrough video URL |
| `src/`, `prisma/`, `tests/` | Source code, schema and migrations, automated tests |
| `samples/` | Example `.txt`, `.md` and `.docx` files for testing import |
| `notes/` | Working notes: AI log and UX notes |

## Status

**Working end to end (all required features):**
- Create, rename, edit and autosave documents with bold, italic, underline, H1 to H3, and bulleted and numbered lists
- Import `.txt`, `.md` and `.docx` (up to 2 MB) as new editable documents
- Share by email with an owner; *My documents* vs *Shared with me*
- Persistence in Postgres; formatting and sharing survive a refresh
- Validation and error messages, 40 automated tests, live deployment

**Stretch goals, all five done:**
- Role-based sharing (Can edit, Can view)
- Export to Markdown and PDF
- Version history with restore
- Comments with quotes and resolve
- Presence indicators (who is viewing or editing)

**Known limits:**
- Sign-in is simulated
- Simultaneous edits to the same document are last-write-wins
- Comments aren't anchored to text
- Presence uses polling

**Next with 2 to 4 more hours:**
- Real auth and email invites
- Real-time co-editing with Yjs
- Anchored comments
- Version preview and diff
