-- Asignación de jefe de obra a proyectos (Kanban Proyectos).
-- Al asignar en proyecto se puede propagar a properties; la app lo hace en cliente.
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS assigned_site_manager_email TEXT NULL;

COMMENT ON COLUMN public.projects.assigned_site_manager_email IS 'Email del jefe de obra asignado a este proyecto. Opcionalmente se propaga a properties del proyecto.';
