-- Migration: Google Calendar Tokens
-- Create table to store Google Calendar OAuth tokens

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_expires_at ON google_calendar_tokens(expires_at);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own tokens
CREATE POLICY "Users can view their own Google Calendar tokens"
  ON google_calendar_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own Google Calendar tokens"
  ON google_calendar_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own Google Calendar tokens"
  ON google_calendar_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own Google Calendar tokens"
  ON google_calendar_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_calendar_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_tokens_updated_at();

-- Create table to track synced events (for bidirectional sync)
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'estimated_visit', 'start_date', 'estimated_end_date', 'property_ready', 'manual_visit', 'reminder'
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id, event_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_user_id ON google_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_property_id ON google_calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id);

-- Enable RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view their own Google Calendar events"
  ON google_calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google Calendar events"
  ON google_calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google Calendar events"
  ON google_calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google Calendar events"
  ON google_calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at for events
CREATE TRIGGER update_google_calendar_events_updated_at
  BEFORE UPDATE ON google_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_tokens_updated_at();

