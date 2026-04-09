-- AlterTable: add name column to Queen
ALTER TABLE "Queen" ADD COLUMN "name" TEXT;

-- CreateTable: QueenMovement
CREATE TABLE "QueenMovement" (
    "id" TEXT NOT NULL,
    "queenId" TEXT NOT NULL,
    "fromHiveId" TEXT,
    "toHiveId" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueenMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueenMovement_queenId_idx" ON "QueenMovement"("queenId");

-- CreateIndex
CREATE INDEX "QueenMovement_fromHiveId_idx" ON "QueenMovement"("fromHiveId");

-- CreateIndex
CREATE INDEX "QueenMovement_toHiveId_idx" ON "QueenMovement"("toHiveId");

-- AddForeignKey
ALTER TABLE "QueenMovement" ADD CONSTRAINT "QueenMovement_queenId_fkey" FOREIGN KEY ("queenId") REFERENCES "Queen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueenMovement" ADD CONSTRAINT "QueenMovement_fromHiveId_fkey" FOREIGN KEY ("fromHiveId") REFERENCES "Hive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueenMovement" ADD CONSTRAINT "QueenMovement_toHiveId_fkey" FOREIGN KEY ("toHiveId") REFERENCES "Hive"("id") ON DELETE SET NULL ON UPDATE CASCADE;
