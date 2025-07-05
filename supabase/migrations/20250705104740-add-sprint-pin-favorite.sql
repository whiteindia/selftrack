-- Add pin and favorite columns to sprints table
ALTER TABLE sprints 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_sprints_pinned ON sprints(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_sprints_favorite ON sprints(is_favorite) WHERE is_favorite = TRUE; 