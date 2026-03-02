-- Add renovation_executor column to projects table
-- Airtable field: "Renovation executor" (fldojf9FKqX3kkh9p)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS renovation_executor TEXT;
