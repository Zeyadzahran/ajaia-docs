# UX notes

What changed in the UI pass and why. Source for the "UX" part of the architecture note.

## Visual system
- **One palette:** neutral greys for surfaces and text, and one green accent (`brand`) used only for primary actions, the logo, and active or saved states. The first version mixed Tailwind's default blue and slate and looked like a template.
- **One shape system:** buttons and inputs are 8px, cards and dialogs 12px, badges are pills, the page is nearly square like paper. All buttons come from one helper (`src/components/ui.ts`), so height, focus ring and pressed state match everywhere.
- **Real icons** (Phosphor) replace text glyphs (B, I, U, H1, ↶) and hand-drawn SVGs, and every icon-only button has a tooltip and an `aria-label`.
- **Logo:** an icon plus the product name, instead of a letter in a coloured square.

## Document page
- Three stacked bars became one white header block: back arrow, title, role, presence, History, Share; then the formatting toolbar with save status and Export on the right.
- The document sits on a page-width sheet (816px, like Letter/A4) on a grey canvas, so it reads as a document and not a form.
- Save status is short and always in the same place: "Saving…", then "Saved" with a check, or an error with Retry.
- Viewers get a clear "View only" line instead of a toolbar that doesn't work.

## Flows
- **Sign-in** explains that it's a demo and shows what each account can do ("Owns the welcome doc", "Can edit", "Can only view"), so a reviewer knows whom to pick for each test.
- **Documents list:** owned vs shared is shown by section and by tag ("Shared with 2 people", "Can view"), plus the owner's name on shared docs.
- **Share dialog:** add by email with a role, change a role inline, remove; demo emails are suggested in the input.
- **Mobile:** the header wraps, the title keeps its own line, and the toolbar is one row that scrolls sideways. No horizontal page scroll at 375px.

## Not done (would do next)
- Dark mode.
- A command palette and keyboard shortcut help.
- Inline comment anchors in the text (comments are document-level today).
