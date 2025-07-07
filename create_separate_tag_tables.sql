-- Create separate tag tables for each note type

-- 1. Create codi_tags table
CREATE TABLE IF NOT EXISTS codi_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create trada_tags table
CREATE TABLE IF NOT EXISTS trada_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create sticky_tags table
CREATE TABLE IF NOT EXISTS sticky_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update codi_note_tags to reference codi_tags
ALTER TABLE codi_note_tags DROP CONSTRAINT IF EXISTS codi_note_tags_tag_id_fkey;
ALTER TABLE codi_note_tags ADD CONSTRAINT codi_note_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES codi_tags(id) ON DELETE CASCADE;

-- 5. Update trada_note_tags to reference trada_tags
ALTER TABLE trada_note_tags DROP CONSTRAINT IF EXISTS trada_note_tags_tag_id_fkey;
ALTER TABLE trada_note_tags ADD CONSTRAINT trada_note_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES trada_tags(id) ON DELETE CASCADE;

-- 6. Update sticky_note_tags to reference sticky_tags
ALTER TABLE sticky_note_tags DROP CONSTRAINT IF EXISTS sticky_note_tags_tag_id_fkey;
ALTER TABLE sticky_note_tags ADD CONSTRAINT sticky_note_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES sticky_tags(id) ON DELETE CASCADE;

-- 7. Create RLS policies for codi_tags
ALTER TABLE codi_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own codi tags" ON codi_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own codi tags" ON codi_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own codi tags" ON codi_tags
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own codi tags" ON codi_tags
  FOR DELETE USING (true);

-- 8. Create RLS policies for trada_tags
ALTER TABLE trada_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trada tags" ON trada_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own trada tags" ON trada_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own trada tags" ON trada_tags
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own trada tags" ON trada_tags
  FOR DELETE USING (true);

-- 9. Create RLS policies for sticky_tags
ALTER TABLE sticky_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sticky tags" ON sticky_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sticky tags" ON sticky_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own sticky tags" ON sticky_tags
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own sticky tags" ON sticky_tags
  FOR DELETE USING (true);

-- 10. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_codi_tags_updated_at BEFORE UPDATE ON codi_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trada_tags_updated_at BEFORE UPDATE ON trada_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sticky_tags_updated_at BEFORE UPDATE ON sticky_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 