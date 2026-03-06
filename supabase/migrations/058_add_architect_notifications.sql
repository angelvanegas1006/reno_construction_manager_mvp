CREATE TABLE IF NOT EXISTS architect_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  architect_name text NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS architect_notifications_architect_name_idx ON architect_notifications(architect_name);
CREATE INDEX IF NOT EXISTS architect_notifications_read_idx ON architect_notifications(read);

ALTER TABLE architect_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Architects can read their own notifications"
  ON architect_notifications FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert notifications"
  ON architect_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Architects can update their own notifications"
  ON architect_notifications FOR UPDATE
  USING (true);
