-- Convertir campos de attachment de TEXT a JSONB para almacenar metadatos completos
-- Formato: [{"url": "...", "filename": "...", "type": "...", "size": 1234}]

-- Primero limpiar datos existentes que son TEXT plano (URLs simples) convirtiéndolos a JSONB array
-- draft_plan
ALTER TABLE projects
  ALTER COLUMN draft_plan TYPE JSONB
  USING CASE
    WHEN draft_plan IS NULL THEN NULL
    WHEN draft_plan LIKE '[%' THEN draft_plan::jsonb
    ELSE jsonb_build_array(jsonb_build_object('url', draft_plan, 'filename', 'draft_plan', 'type', 'unknown'))
  END;

-- technical_project_doc
ALTER TABLE projects
  ALTER COLUMN technical_project_doc TYPE JSONB
  USING CASE
    WHEN technical_project_doc IS NULL THEN NULL
    WHEN technical_project_doc LIKE '[%' THEN technical_project_doc::jsonb
    ELSE jsonb_build_array(jsonb_build_object('url', technical_project_doc, 'filename', 'technical_project_doc', 'type', 'unknown'))
  END;

-- final_plan
ALTER TABLE projects
  ALTER COLUMN final_plan TYPE JSONB
  USING CASE
    WHEN final_plan IS NULL THEN NULL
    WHEN final_plan LIKE '[%' THEN final_plan::jsonb
    ELSE jsonb_build_array(jsonb_build_object('url', final_plan, 'filename', 'final_plan', 'type', 'unknown'))
  END;

-- license_attachment
ALTER TABLE projects
  ALTER COLUMN license_attachment TYPE JSONB
  USING CASE
    WHEN license_attachment IS NULL THEN NULL
    WHEN license_attachment LIKE '[%' THEN license_attachment::jsonb
    ELSE jsonb_build_array(jsonb_build_object('url', license_attachment, 'filename', 'license_attachment', 'type', 'unknown'))
  END;
