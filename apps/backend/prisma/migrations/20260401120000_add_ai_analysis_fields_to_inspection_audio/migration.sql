ALTER TABLE "InspectionAudio"
ADD COLUMN "analysisResult" JSONB,
ADD COLUMN "analysisError" TEXT,
ADD COLUMN "analysisCompletedAt" TIMESTAMP(3);