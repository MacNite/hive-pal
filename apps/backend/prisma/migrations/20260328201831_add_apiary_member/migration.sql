-- CreateEnum
CREATE TYPE "ApiaryRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "ApiaryMember" (
    "id" TEXT NOT NULL,
    "apiaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ApiaryRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiaryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiaryInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "apiaryId" TEXT NOT NULL,
    "role" "ApiaryRole" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiaryInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiaryMember_userId_idx" ON "ApiaryMember"("userId");

-- CreateIndex
CREATE INDEX "ApiaryMember_apiaryId_idx" ON "ApiaryMember"("apiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiaryMember_apiaryId_userId_key" ON "ApiaryMember"("apiaryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiaryInvite_token_key" ON "ApiaryInvite"("token");

-- CreateIndex
CREATE INDEX "ApiaryInvite_token_idx" ON "ApiaryInvite"("token");

-- CreateIndex
CREATE INDEX "ApiaryInvite_apiaryId_idx" ON "ApiaryInvite"("apiaryId");

-- AddForeignKey
ALTER TABLE "ApiaryMember" ADD CONSTRAINT "ApiaryMember_apiaryId_fkey" FOREIGN KEY ("apiaryId") REFERENCES "Apiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiaryMember" ADD CONSTRAINT "ApiaryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiaryInvite" ADD CONSTRAINT "ApiaryInvite_apiaryId_fkey" FOREIGN KEY ("apiaryId") REFERENCES "Apiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
