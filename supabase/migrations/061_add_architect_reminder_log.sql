CREATE TABLE IF NOT EXISTS architect_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(project_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_project ON architect_reminder_log(project_id);

ALTER TABLE architect_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage reminder log"
  ON architect_reminder_log FOR ALL
  USING (true)
  WITH CHECK (true);
