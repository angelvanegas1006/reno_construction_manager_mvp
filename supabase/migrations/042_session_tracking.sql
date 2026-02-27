-- Tabla para tracking de sesiones de usuario
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  duration_seconds INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);

COMMENT ON TABLE public.user_sessions IS 'Registra sesiones de usuario para medir tiempo de uso de la aplicación';
COMMENT ON COLUMN public.user_sessions.duration_seconds IS 'Duración calculada al cerrar sesión: ended_at - started_at en segundos';

-- RLS: cada usuario puede insertar/actualizar sus propias sesiones, admin puede leer todas
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir a service_role leer todas (para queries admin)
-- El service_role ya bypassa RLS por defecto
