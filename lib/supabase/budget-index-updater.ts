/**
 * Utilidad para actualizar budget_index de categorías después de que n8n las inserte
 * Como no podemos modificar n8n, actualizamos el budget_index basándonos en:
 * 1. El orden de las URLs en budget_pdf_url
 * 2. El created_at de las categorías (las más recientes corresponden al último presupuesto procesado)
 */

import { createAdminClient } from '@/lib/supabase/admin';

interface BudgetUrlMapping {
  url: string;
  index: number;
}

/**
 * Actualiza el budget_index de las categorías recién creadas para una propiedad
 * Estrategia: Agrupar categorías por ventanas de tiempo y asignar índices basándose en el orden de creación
 * @param propertyId ID de la propiedad
 * @param budgetUrls Array de URLs de presupuestos en orden
 */
export async function updateBudgetIndexForCategories(
  propertyId: string,
  budgetUrls: string[]
): Promise<{ updated: number; errors: string[] }> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let updated = 0;

  try {
    // Si solo hay un presupuesto, todas las categorías son del índice 1
    if (budgetUrls.length === 1) {
      const { data: categories, error: fetchError } = await supabase
        .from('property_dynamic_categories')
        .select('id')
        .eq('property_id', propertyId)
        .or('budget_index.is.null,budget_index.eq.1');

      if (fetchError) {
        throw new Error(`Error fetching categories: ${fetchError.message}`);
      }

      if (categories && categories.length > 0) {
        const { error: updateError } = await supabase
          .from('property_dynamic_categories')
          .update({ budget_index: 1 })
          .in('id', categories.map(c => c.id));

        if (updateError) {
          errors.push(`Error updating categories: ${updateError.message}`);
        } else {
          updated = categories.length;
        }
      }
      
      return { updated, errors };
    }

    // Para múltiples presupuestos: obtener categorías sin budget_index o con valor 1
    // Ordenadas por created_at ascendente (más antiguas primero)
    const { data: categories, error: fetchError } = await supabase
      .from('property_dynamic_categories')
      .select('id, created_at, budget_index')
      .eq('property_id', propertyId)
      .or('budget_index.is.null,budget_index.eq.1')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Error fetching categories: ${fetchError.message}`);
    }

    if (!categories || categories.length === 0) {
      return { updated: 0, errors: [] };
    }

    // Agrupar categorías por ventanas de tiempo (categorías creadas en el mismo segundo/minuto)
    // Esto nos ayuda a identificar qué categorías fueron insertadas juntas (del mismo presupuesto)
    const timeWindows = new Map<number, typeof categories>();
    categories.forEach(cat => {
      const createdAt = new Date(cat.created_at || 0).getTime();
      // Agrupar por ventanas de 10 segundos (ajustable según necesidad)
      const windowKey = Math.floor(createdAt / 10000);
      
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(cat);
    });

    // Ordenar ventanas por tiempo (más antiguas primero)
    const sortedWindows = Array.from(timeWindows.entries())
      .sort((a, b) => a[0] - b[0]); // Ascendente

    // Estrategia: Dividir las categorías en grupos iguales según el número de presupuestos
    // Asumimos que las categorías se insertan en orden (presupuesto 1 primero, luego 2, etc.)
    // y que cada presupuesto tiene aproximadamente el mismo número de categorías
    
    const totalCategories = categories.length;
    const categoriesPerBudget = Math.ceil(totalCategories / budgetUrls.length);
    
    for (let i = 0; i < budgetUrls.length; i++) {
      const budgetIndex = i + 1;
      const startIndex = i * categoriesPerBudget;
      const endIndex = Math.min(startIndex + categoriesPerBudget, totalCategories);
      
      const categoriesForThisBudget = categories.slice(startIndex, endIndex);
      const categoryIds = categoriesForThisBudget.map(cat => cat.id);

      if (categoryIds.length > 0) {
        const { error: updateError } = await supabase
          .from('property_dynamic_categories')
          .update({ budget_index: budgetIndex })
          .in('id', categoryIds);

        if (updateError) {
          errors.push(`Error updating budget_index ${budgetIndex}: ${updateError.message}`);
        } else {
          updated += categoryIds.length;
          console.log(`[Budget Index Updater] Updated ${categoryIds.length} categories with budget_index=${budgetIndex}`);
        }
      }
    }

    return { updated, errors };
  } catch (error: any) {
    errors.push(error.message || 'Unknown error');
    return { updated, errors };
  }
}

/**
 * Actualiza el budget_index inmediatamente después de llamar al webhook
 * Espera un delay y luego actualiza las categorías recién creadas
 */
export async function scheduleBudgetIndexUpdate(
  propertyId: string,
  budgetUrls: string[],
  delayMs: number = 10000 // 10 segundos por defecto
): Promise<void> {
  setTimeout(async () => {
    console.log(`[Budget Index Updater] Updating budget_index for property ${propertyId} after delay`);
    const result = await updateBudgetIndexForCategories(propertyId, budgetUrls);
    console.log(`[Budget Index Updater] Updated ${result.updated} categories, errors: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.error('[Budget Index Updater] Errors:', result.errors);
    }
  }, delayMs);
}
