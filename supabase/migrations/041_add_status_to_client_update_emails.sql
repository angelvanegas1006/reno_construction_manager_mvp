-- Añadir columna status a client_update_emails para soportar borradores
-- Los registros existentes se marcan como 'sent' (ya fueron enviados)

ALTER TABLE public.client_update_emails
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent'));

-- Marcar todos los registros existentes como enviados
UPDATE public.client_update_emails SET status = 'sent' WHERE status = 'draft';

COMMENT ON COLUMN public.client_update_emails.status IS 'draft = generado por foreman pendiente de revisión; sent = enviado al cliente por set_up_analyst';
