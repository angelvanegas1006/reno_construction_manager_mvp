-- Migración: Añadir campos para historial de progreso y tabla para updates enviados a cliente
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir campo category_text a category_updates para guardar el texto generado de cada categoría
ALTER TABLE category_updates 
ADD COLUMN IF NOT EXISTS category_text TEXT;

COMMENT ON COLUMN category_updates.category_text IS 'Texto generado por IA para esta categoría en este update';

-- 2. Crear tabla para guardar los HTML de updates enviados a cliente
CREATE TABLE IF NOT EXISTS client_update_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    html_content TEXT NOT NULL, -- HTML completo del email enviado
    client_email TEXT, -- Email del cliente al que se envió
    subject TEXT, -- Asunto del email
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT, -- ID del usuario que envió el update
    
    -- Foreign key
    CONSTRAINT fk_client_update_emails_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_client_update_emails_property_id 
    ON client_update_emails(property_id);

CREATE INDEX IF NOT EXISTS idx_client_update_emails_sent_at 
    ON client_update_emails(sent_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE client_update_emails IS 'Historial de HTML de updates de progreso enviados a clientes. Cada vez que se envía un update por email, se guarda el HTML generado aquí.';
COMMENT ON COLUMN client_update_emails.html_content IS 'HTML completo del email enviado al cliente';
COMMENT ON COLUMN client_update_emails.client_email IS 'Email del cliente al que se envió el update';
COMMENT ON COLUMN client_update_emails.sent_at IS 'Fecha y hora en que se envió el email';

