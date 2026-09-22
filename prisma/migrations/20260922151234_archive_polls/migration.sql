-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "archived_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "polls_creator_id_archived_at_idx" ON "polls"("creator_id", "archived_at");
