-- ============================================
-- Migración 003: Tabla de Conversaciones de Ayuda
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Crear tabla para almacenar conversaciones de ayuda
CREATE TABLE IF NOT EXISTS help_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    
    -- Información del mensaje original
    original_message TEXT NOT NULL,
    error_type TEXT CHECK (error_type IN ('property', 'general')),
    
    -- Información de propiedad (si aplica)
    property_address TEXT,
    property_airtable_id TEXT,
    
    -- Respuesta del equipo
    response_message TEXT,
    response_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Estados
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_help_conversations_user_id ON help_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_help_conversations_is_read ON help_conversations(is_read);
CREATE INDEX IF NOT EXISTS idx_help_conversations_created_at ON help_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_conversations_response_received_at ON help_conversations(response_received_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_help_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_help_conversations_updated_at_trigger
    BEFORE UPDATE ON help_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_help_conversations_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE help_conversations IS 'Almacena las conversaciones de ayuda entre usuarios y el equipo de soporte';
COMMENT ON COLUMN help_conversations.error_type IS 'Tipo de error: property (relacionado con propiedad) o general (error general de la app)';
COMMENT ON COLUMN help_conversations.is_read IS 'Indica si el usuario ha leído la respuesta del equipo';

