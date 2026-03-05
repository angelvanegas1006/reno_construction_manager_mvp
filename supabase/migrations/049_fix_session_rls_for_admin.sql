-- Allow admin and construction_manager roles to read all user sessions
CREATE POLICY "Admins can read all sessions"
  ON public.user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'construction_manager')
    )
  );
