-- Create function for updated_at trigger (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create table for user column preferences
CREATE TABLE IF NOT EXISTS user_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type VARCHAR(50) NOT NULL, -- e.g., 'reno_kanban_list'
  phase VARCHAR(50) NOT NULL, -- e.g., 'upcoming-settlements', 'initial-check', etc.
  visible_columns TEXT[] NOT NULL DEFAULT '{}', -- Array of column keys
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, view_type, phase)
);

-- Indexes
CREATE INDEX idx_user_column_preferences_user_id ON user_column_preferences(user_id);
CREATE INDEX idx_user_column_preferences_view_type ON user_column_preferences(view_type);
CREATE INDEX idx_user_column_preferences_phase ON user_column_preferences(phase);

-- Trigger for updated_at
CREATE TRIGGER update_user_column_preferences_updated_at 
  BEFORE UPDATE ON user_column_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_column_preferences ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and modify their own preferences
CREATE POLICY "Users can view their own column preferences"
  ON user_column_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column preferences"
  ON user_column_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column preferences"
  ON user_column_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column preferences"
  ON user_column_preferences FOR DELETE
  USING (auth.uid() = user_id);
