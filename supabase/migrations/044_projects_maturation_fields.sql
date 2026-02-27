-- Nuevos campos en projects para la sincronización del Kanban de Maduración.
-- Field IDs de Airtable documentados como comentarios.

-- Primera Parte
ALTER TABLE projects ADD COLUMN IF NOT EXISTS est_properties TEXT;           -- fldHyN7COZgThuPsL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS architect TEXT;                -- fldsAsdiGeOaQvlHe
ALTER TABLE projects ADD COLUMN IF NOT EXISTS excluded_from_ecu BOOLEAN;     -- fldbOhkaWOFxgEF9N
ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_order_date TIMESTAMPTZ;  -- fldolJBkc8xg4zX4u
ALTER TABLE projects ADD COLUMN IF NOT EXISTS measurement_date TIMESTAMPTZ;  -- flduoq2AThXWINa12
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_draft_date TIMESTAMPTZ;-- fld1MRXYInkTA5zfY
ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_plan TEXT;               -- fldb2MtV66Z7lOknJ (URL/attachment)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_validation_notes TEXT; -- fldSv6DaHv0JiVnAI
ALTER TABLE projects ADD COLUMN IF NOT EXISTS offer_status TEXT;             -- fldhwWGWazLA4hcWU

-- Segunda Parte
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_contact TEXT;              -- fld4Xgn8xt2OD7iF4
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_project_end_date TIMESTAMPTZ; -- fldBd9H8MzeIB7FLE
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_end_date TIMESTAMPTZ;  -- fldU09hsxbuciKWLi
ALTER TABLE projects ADD COLUMN IF NOT EXISTS arras_deadline TIMESTAMPTZ;    -- fld7WWN0ZwhTsUKfJ

-- Tercera Parte
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecu_delivery_date TIMESTAMPTZ;            -- fldZw1fCoB7P4uec9
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_first_correction_date TIMESTAMPTZ; -- fld48U9r5NgQIOkyY
ALTER TABLE projects ADD COLUMN IF NOT EXISTS first_correction_date TIMESTAMPTZ;        -- fldobn5jZpdWBJyn3
ALTER TABLE projects ADD COLUMN IF NOT EXISTS first_validation_duration NUMERIC;        -- fldiBaYTDuEqcAuw4
ALTER TABLE projects ADD COLUMN IF NOT EXISTS definitive_validation_date TIMESTAMPTZ;   -- fldSPVWoaocQwpx0S
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_project_doc TEXT;    -- fldqmIliUeNEjIQUO (URL/attachment)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_plan TEXT;               -- fldz5e4HkJWDByrtj (URL/attachment)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS license_attachment TEXT;       -- fldpOMBUKylokMJ0E (URL/attachment)
