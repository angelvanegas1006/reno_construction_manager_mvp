-- Migración para cambiar days_to_visit de date a numeric
-- Ejecutar desde Supabase SQL Editor

DO $$
BEGIN
    -- Verificar si la columna existe y es de tipo date
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'properties' 
        AND column_name = 'days_to_visit'
        AND data_type = 'date'
    ) THEN
        -- Primero, eliminar cualquier dato existente (ya que son fechas y necesitamos números)
        -- O convertir fechas a días si es necesario (por ahora las eliminamos)
        UPDATE properties 
        SET days_to_visit = NULL 
        WHERE days_to_visit IS NOT NULL;
        
        -- Cambiar el tipo de columna de date a integer (numeric)
        ALTER TABLE properties 
        ALTER COLUMN days_to_visit TYPE integer 
        USING NULL;
        
        RAISE NOTICE 'Columna days_to_visit cambiada de date a integer exitosamente';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'properties' 
        AND column_name = 'days_to_visit'
        AND data_type = 'integer'
    ) THEN
        RAISE NOTICE 'La columna days_to_visit ya es de tipo integer, no se requiere cambio';
    ELSE
        -- Si la columna no existe, crearla como integer
        ALTER TABLE properties 
        ADD COLUMN days_to_visit integer;
        
        RAISE NOTICE 'Columna days_to_visit creada como integer';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al cambiar el tipo de columna: %', SQLERRM;
END $$;

