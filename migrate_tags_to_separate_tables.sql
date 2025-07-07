-- Migrate existing tags to separate tag tables
-- This will copy tags from the original tags table to the new separate tables

-- First, let's see what tags exist
SELECT 'Original tags table:' as info;
SELECT * FROM tags;

-- Copy tags to codi_tags
INSERT INTO codi_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

-- Copy tags to trada_tags  
INSERT INTO trada_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

-- Copy tags to sticky_tags
INSERT INTO sticky_tags (id, name, color, created_at, updated_at)
SELECT id, name, color, created_at, updated_at FROM tags
ON CONFLICT (id) DO NOTHING;

-- Verify the migration
SELECT 'codi_tags:' as table_name, COUNT(*) as count FROM codi_tags
UNION ALL
SELECT 'trada_tags:' as table_name, COUNT(*) as count FROM trada_tags  
UNION ALL
SELECT 'sticky_tags:' as table_name, COUNT(*) as count FROM sticky_tags; 