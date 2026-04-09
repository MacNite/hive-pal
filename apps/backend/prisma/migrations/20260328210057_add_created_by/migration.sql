-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "QuickCheck" ADD COLUMN     "createdByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickCheck" ADD CONSTRAINT "QuickCheck_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
