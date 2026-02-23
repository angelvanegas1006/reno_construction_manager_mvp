-- Añadir columna renovator_contract_doc_url para el documento de contrato reformista desde Airtable
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS renovator_contract_doc_url TEXT;

COMMENT ON COLUMN properties.renovator_contract_doc_url IS 'URL del documento de contrato reformista desde Airtable (Renovator contract doc, fldghjw7a7VhMYXaS)';
