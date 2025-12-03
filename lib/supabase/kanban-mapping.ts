import { RenoKanbanPhase } from '@/lib/reno-kanban-config';

/**
 * Maps Supabase "Set Up Status" values to Reno Kanban phases
 */
export function mapSetUpStatusToKanbanPhase(setUpStatus: string | null): RenoKanbanPhase | null {
  if (!setUpStatus) return null;

  const status = setUpStatus.trim().toLowerCase();

  // Mapeo de valores de "Set Up Status" a columnas del kanban
  // IMPORTANTE: Ordenar de más específico a menos específico para evitar coincidencias incorrectas
  const mapping: Record<string, RenoKanbanPhase> = {
    // Upcoming Settlements - View: viwpYQ0hsSSdFrSD1
    // Estas son propiedades que están próximas a escrituración
    'pending to visit': 'upcoming-settlements',
    'nuevas escrituras': 'upcoming-settlements',
    
    // Check Inicial → initial-check
    'check inicial': 'initial-check',
    'initial check': 'initial-check',
    
    // Nuevas fases divididas de Reno Budget
    // IMPORTANTE: Ordenar de más específico a menos específico
    // 1. Pendiente Presupuesto (Renovador) - más específico primero
    'pending to validate budget (from renovator)': 'reno-budget-renovator',
    'pending to budget (from renovator)': 'reno-budget-renovator', // Variación sin "validate"
    'pending to budget from renovator': 'reno-budget-renovator', // Sin paréntesis
    'pending budget from renovator': 'reno-budget-renovator', // Variación
    
    // 2. Pendiente Presupuesto (Cliente) - más específico primero
    'pending to validate budget (from client)': 'reno-budget-client', // Valor exacto
    'pending to budget (from client)': 'reno-budget-client', // Variación sin "validate"
    'pending to budget from client': 'reno-budget-client', // Sin paréntesis
    'pending budget from client': 'reno-budget-client', // Variación
    
    // 3. Obra a Empezar
    'reno to start': 'reno-budget-start',
    'obra para empezar': 'reno-budget-start', // Español
    'obra a empezar': 'reno-budget-start', // Variación español
    
    // Legacy Reno Budget - mantener para compatibilidad (oculto)
    'pending to validate budget (client & renovator) & reno to start': 'reno-budget',
    'pending to validate budget': 'reno-budget',
    'pending to validate budget & reno to start': 'reno-budget',
    'proximas propiedades': 'reno-budget',
    'upcoming': 'reno-budget', // Legacy
    
    // Obras en proceso → reno-in-progress
    'reno in progress': 'reno-in-progress',
    'obras en proceso': 'reno-in-progress',
    
    // Limpieza y amoblamiento → furnishing-cleaning
    'cleaning & furnishing': 'furnishing-cleaning',
    'limpieza y amoblamiento': 'furnishing-cleaning',
    'cleaning and furnishing': 'furnishing-cleaning',
    
    // Check final → final-check
    'final check': 'final-check',
    'check final': 'final-check',
    
    // TODO: Agregar mapeos para reno-fixes y done cuando se definan
    // 'reno fixes': 'reno-fixes',
    // 'done': 'done',
    // 'completed': 'done',
  };

  // Buscar coincidencia exacta primero
  if (mapping[status]) {
    return mapping[status];
  }

  // Luego buscar coincidencias parciales, priorizando las más específicas
  // Ordenar las claves por longitud descendente para priorizar las más específicas
  const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    // Buscar si el status contiene la clave completa (coincidencia parcial)
    // IMPORTANTE: Usar includes() para que "pending to validate budget (from client)" 
    // coincida con la clave completa, no solo con una parte
    if (status.includes(key)) {
      return mapping[key];
    }
  }

  // Si no hay coincidencia, retornar null para que se ignore
  return null;
}

/**
 * Gets all valid kanban phases that have a mapping
 */
export function getMappedKanbanPhases(): RenoKanbanPhase[] {
  return [
    'upcoming-settlements',
    'initial-check',
    'reno-budget-renovator',
    'reno-budget-client',
    'reno-budget-start',
    'reno-budget', // Legacy - mantener para compatibilidad
    'reno-in-progress',
    'furnishing-cleaning',
    'final-check',
    // 'reno-fixes', // TODO: Agregar cuando se defina el mapeo
    // 'done', // TODO: Agregar cuando se defina el mapeo
  ];
}

