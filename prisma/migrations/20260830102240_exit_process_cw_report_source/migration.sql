-- AlterTable
ALTER TABLE "ExitProcess" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'QUICKBASE',
ALTER COLUMN "quickbaseRecordId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExitProcess_employeeName_source_key" ON "ExitProcess"("employeeName", "source");
