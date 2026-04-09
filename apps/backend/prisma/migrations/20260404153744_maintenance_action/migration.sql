-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'MAINTENANCE';

-- CreateTable
CREATE TABLE "MaintenanceAction" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "MaintenanceAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAction_actionId_key" ON "MaintenanceAction"("actionId");

-- AddForeignKey
ALTER TABLE "MaintenanceAction" ADD CONSTRAINT "MaintenanceAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
