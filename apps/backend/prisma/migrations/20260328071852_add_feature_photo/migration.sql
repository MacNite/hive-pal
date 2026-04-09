/*
  Warnings:

  - A unique constraint covering the columns `[featurePhotoId]` on the table `Apiary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[featurePhotoId]` on the table `Hive` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Apiary" ADD COLUMN     "featurePhotoId" TEXT;

-- AlterTable
ALTER TABLE "Hive" ADD COLUMN     "featurePhotoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Apiary_featurePhotoId_key" ON "Apiary"("featurePhotoId");

-- CreateIndex
CREATE UNIQUE INDEX "Hive_featurePhotoId_key" ON "Hive"("featurePhotoId");

-- AddForeignKey
ALTER TABLE "Apiary" ADD CONSTRAINT "Apiary_featurePhotoId_fkey" FOREIGN KEY ("featurePhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hive" ADD CONSTRAINT "Hive_featurePhotoId_fkey" FOREIGN KEY ("featurePhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
