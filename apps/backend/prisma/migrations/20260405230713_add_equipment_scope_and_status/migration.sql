-- Add EquipmentScope enum
CREATE TYPE "EquipmentScope" AS ENUM ('PER_HIVE', 'SHARED');

-- Add new columns to EquipmentItem
ALTER TABLE "EquipmentItem"
  ADD COLUMN IF NOT EXISTS "scope" "EquipmentScope" NOT NULL DEFAULT 'PER_HIVE',
  ADD COLUMN IF NOT EXISTS "inExtraction" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "damaged" FLOAT NOT NULL DEFAULT 0;

-- Backfill: TOOLS, PROTECTIVE, EXTRACTION categories are SHARED
UPDATE "EquipmentItem"
SET "scope" = 'SHARED'
WHERE "category" IN ('TOOLS', 'PROTECTIVE', 'EXTRACTION');
