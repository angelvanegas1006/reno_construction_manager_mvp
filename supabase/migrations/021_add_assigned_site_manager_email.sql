/* Asignación de jefe de obra en segundo kanban (Proyectos/WIP).
   Campo solo en Supabase; no se sincroniza con Airtable. */
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS assigned_site_manager_email TEXT NULL;

COMMENT ON COLUMN public.properties.assigned_site_manager_email IS 'Email del jefe de obra asignado a esta obra en el kanban Proyectos/WIP; no modifica Technical construction.';
