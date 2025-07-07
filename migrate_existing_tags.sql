-- Migration script to move existing tags to separate tag tables
-- Run this AFTER creating the separate tag tables

-- 1. First, let's see what tags exist in the original tags table
-- SELECT * FROM tags;

-- 2. Copy all existing tags to the new tag tables
INSERT INTO codi_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

INSERT INTO trada_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

INSERT INTO sticky_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

-- 3. Now the foreign key constraints should work because the tag IDs exist in the new tables
-- The existing note_tag relationships will now reference the correct tag tables

-- 4. Optional: If you want to clean up the old tags table later, you can do:
-- DROP TABLE IF EXISTS tags CASCADE;
-- (Only do this after confirming everything works correctly) 