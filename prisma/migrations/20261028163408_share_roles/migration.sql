-- CreateEnum
CREATE TYPE "share_role" AS ENUM ('VIEWER', 'EDITOR');

-- AlterTable
ALTER TABLE "document_shares" ADD COLUMN     "role" "share_role" NOT NULL DEFAULT 'EDITOR';
