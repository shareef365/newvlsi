-- Run once to add a favorite flag to existing databases
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT 0;
