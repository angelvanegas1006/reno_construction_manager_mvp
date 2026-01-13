-- Migración SQL para añadir la columna real_settlement_date a la tabla properties
-- Formato: DATE (YYYY-MM-DD)

-- Verificar si la columna ya existe antes de añadirla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'properties' 
        AND column_name = 'real_settlement_date'
    ) THEN
        ALTER TABLE properties 
        ADD COLUMN real_settlement_date DATE;
        
        RAISE NOTICE 'Columna real_settlement_date añadida exitosamente';
    ELSE
        RAISE NOTICE 'La columna real_settlement_date ya existe';
    END IF;
END $$;

-- Verificar que se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'properties' 
AND column_name = 'real_settlement_date';

