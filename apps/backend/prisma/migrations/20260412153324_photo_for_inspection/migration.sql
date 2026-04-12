-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "inspectionId" TEXT;

-- CreateIndex
CREATE INDEX "Photo_inspectionId_idx" ON "Photo"("inspectionId");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
