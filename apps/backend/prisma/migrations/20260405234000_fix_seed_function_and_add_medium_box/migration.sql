-- Update create_default_equipment_items to use targetHives (not targetMultiplier)
-- and add MEDIUM_BOX to the default item set.

CREATE OR REPLACE FUNCTION create_default_equipment_items(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO "EquipmentMultiplier" (id, "userId", "targetHives", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), user_id_param, 0, NOW(), NOW())
  ON CONFLICT ("userId") DO NOTHING;

  INSERT INTO "EquipmentItem" (id, "userId", "itemId", name, enabled, "perHive", extra, "inExtraction", damaged, "neededOverride", category, scope, unit, "isCustom", "displayOrder", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), user_id_param, 'DEEP_BOX',       'Deep Boxes',       true,  1,  0, 0, 0, null, 'BOXES',     'PER_HIVE', 'pieces', false, 1,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'MEDIUM_BOX',     'Medium Boxes',     true,  0,  0, 0, 0, null, 'BOXES',     'PER_HIVE', 'pieces', false, 2,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'SHALLOW_BOX',    'Shallow Boxes',    true,  2,  0, 0, 0, null, 'BOXES',     'PER_HIVE', 'pieces', false, 3,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'BOTTOM_BOARD',   'Bottom Boards',    true,  1,  0, 0, 0, null, 'HIVE_PARTS','PER_HIVE', 'pieces', false, 4,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'COVER',          'Covers',           true,  1,  0, 0, 0, null, 'HIVE_PARTS','PER_HIVE', 'pieces', false, 5,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'QUEEN_EXCLUDER', 'Queen Excluders',  true,  1,  0, 0, 0, null, 'HIVE_PARTS','PER_HIVE', 'pieces', false, 6,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'FRAMES',         'Frames',           true,  0,  0, 0, 0, null, 'FRAMES',    'PER_HIVE', 'pieces', false, 7,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'FEEDER',         'Feeders',          false, 0,  0, 0, 0, null, 'FEEDING',   'PER_HIVE', 'pieces', false, 8,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'SUGAR',          'Sugar',            true,  12, 0, 0, 0, null, 'FEEDING',   'PER_HIVE', 'kg',     false, 9,  NOW(), NOW()),
    (gen_random_uuid(), user_id_param, 'SYRUP',          'Syrup',            false, 0,  0, 0, 0, null, 'FEEDING',   'PER_HIVE', 'liters', false, 10, NOW(), NOW())
  ON CONFLICT ("userId", "itemId") DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Backfill MEDIUM_BOX for existing users who don't already have it
INSERT INTO "EquipmentItem" (id, "userId", "itemId", name, enabled, "perHive", extra, "inExtraction", damaged, "neededOverride", category, scope, unit, "isCustom", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "userId", 'MEDIUM_BOX', 'Medium Boxes', true, 0, 0, 0, 0, null, 'BOXES', 'PER_HIVE', 'pieces', false, 2, NOW(), NOW()
FROM "EquipmentItem"
WHERE "itemId" = 'DEEP_BOX'
ON CONFLICT ("userId", "itemId") DO NOTHING;
