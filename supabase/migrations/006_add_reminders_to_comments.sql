-- Migración: Agregar funcionalidad de recordatorios a comentarios
-- Ejecutar en Supabase SQL Editor

-- Agregar campos de recordatorio a property_comments
ALTER TABLE property_comments
ADD COLUMN IF NOT EXISTS is_reminder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_notification_date TIMESTAMP WITH TIME ZONE;

-- Crear tabla de notificaciones/recordatorios
CREATE TABLE IF NOT EXISTS property_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES property_comments(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    reminder_text TEXT NOT NULL,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by TEXT,
    notified BOOLEAN DEFAULT false,
    notification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_property_reminders_property 
        FOREIGN KEY (property_id) 
        REFERENCES properties(id) 
        ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_property_reminders_property_id 
    ON property_reminders(property_id);

CREATE INDEX IF NOT EXISTS idx_property_reminders_comment_id 
    ON property_reminders(comment_id);

CREATE INDEX IF NOT EXISTS idx_property_reminders_date 
    ON property_reminders(reminder_date);

CREATE INDEX IF NOT EXISTS idx_property_reminders_notified 
    ON property_reminders(notified, reminder_date);

CREATE INDEX IF NOT EXISTS idx_property_comments_is_reminder 
    ON property_comments(is_reminder, reminder_date);

-- Comentarios para documentación
COMMENT ON COLUMN property_comments.is_reminder IS 'Indica si el comentario es un recordatorio';
COMMENT ON COLUMN property_comments.reminder_date IS 'Fecha y hora del recordatorio';
COMMENT ON COLUMN property_comments.reminder_notified IS 'Indica si ya se envió la notificación del recordatorio';
COMMENT ON TABLE property_reminders IS 'Recordatorios creados desde comentarios. Generan notificaciones en la fecha especificada.';


