-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';
