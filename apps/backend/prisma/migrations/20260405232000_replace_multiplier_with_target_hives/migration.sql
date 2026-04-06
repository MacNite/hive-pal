-- Replace targetMultiplier (Float) with targetHives (Int)
-- Idempotent: uses IF NOT EXISTS / conditional DROP

ALTER TABLE "EquipmentMultiplier"
  ADD COLUMN IF NOT EXISTS "targetHives" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'EquipmentMultiplier' AND column_name = 'targetMultiplier'
  ) THEN
    ALTER TABLE "EquipmentMultiplier" DROP COLUMN "targetMultiplier";
  END IF;
END $$;
