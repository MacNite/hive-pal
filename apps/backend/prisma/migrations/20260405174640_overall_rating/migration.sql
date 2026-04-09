-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "overallScore" DOUBLE PRECISION,
ADD COLUMN     "populationScore" DOUBLE PRECISION,
ADD COLUMN     "queenScore" DOUBLE PRECISION,
ADD COLUMN     "scoreConfidence" DOUBLE PRECISION,
ADD COLUMN     "scoreWarnings" TEXT,
ADD COLUMN     "storesScore" DOUBLE PRECISION;
