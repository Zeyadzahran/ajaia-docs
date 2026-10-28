// Seeds demo users and one shared document. Safe to run more than once.
// Usage: npx prisma db seed
import { prisma } from "../src/lib/db";

const USERS = [
  { id: "alice", name: "Alice Chen", email: "alice@example.com" },
  { id: "bob", name: "Bob Martin", email: "bob@example.com" },
  { id: "carol", name: "Carol Diaz", email: "carol@example.com" },
];

// Fixed id so re-running the seed never duplicates the welcome doc, even if it was renamed.
const WELCOME_ID = "00000000-0000-4000-8000-000000000001";
const WELCOME_TITLE = "Welcome to Ajaia Docs";

const WELCOME_CONTENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: WELCOME_TITLE }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This document is owned by Alice. " },
        { type: "text", marks: [{ type: "bold" }], text: "Bob can edit" },
        { type: "text", text: " it and " },
        { type: "text", marks: [{ type: "bold" }], text: "Carol can only view" },
        { type: "text", text: " it, so you can try every side of sharing right away." },
      ],
    },
  ],
};

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({ where: { id: user.id }, update: user, create: user });
  }

  // update: {} keeps any edits reviewers made to the doc.
  await prisma.document.upsert({
    where: { id: WELCOME_ID },
    update: {},
    create: { id: WELCOME_ID, title: WELCOME_TITLE, content: WELCOME_CONTENT, ownerId: "alice" },
  });
  // Bob can edit and Carol can only view, so both roles can be tried right away.
  for (const [userId, role] of [["bob", "EDITOR"], ["carol", "VIEWER"]] as const) {
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: WELCOME_ID, userId } },
      update: {},
      create: { documentId: WELCOME_ID, userId, role },
    });
  }

  console.log(`Seeded ${USERS.length} users.`);
}

main().finally(() => prisma.$disconnect());
