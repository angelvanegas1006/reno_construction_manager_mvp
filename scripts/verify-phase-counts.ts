#!/usr/bin/env tsx
/**
 * Script para verificar los conteos de propiedades por fase y detectar duplicados
 * Ejecutar con: npx tsx scripts/verify-phase-counts.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { mapSetUpStatusToKanbanPhase } from '../lib/supabase/kanban-mapping';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔍 Verificando conteos de propiedades por fase...\n');

  const supabase = createAdminClient();

  try {
    // Obtener todas las propiedades
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status"')
      .order('id');

    if (error) {
      console.error('❌ Error obteniendo propiedades:', error.message);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  No se encontraron propiedades');
      return;
    }

    console.log(`📊 Total de propiedades en la base de datos: ${properties.length}\n`);

    // Agrupar por fase usando la misma lógica que el hook
    const grouped: Record<string, string[]> = {
      'upcoming-settlements': [],
      'initial-check': [],
      'upcoming': [],
      'reno-budget-renovator': [],
      'reno-budget-client': [],
      'reno-budget-start': [],
      'reno-budget': [],
      'reno-in-progress': [],
      'furnishing-cleaning': [],
      'final-check': [],
      'reno-fixes': [],
      'done': [],
    };

    const propertyIdsSeen = new Set<string>();
    const duplicates: string[] = [];

    properties.forEach((prop: any) => {
      // Verificar duplicados
      if (propertyIdsSeen.has(prop.id)) {
        duplicates.push(prop.id);
        return;
      }
      propertyIdsSeen.add(prop.id);

      // Determinar fase usando la misma lógica que convertSupabasePropertyToKanbanProperty
      let kanbanPhase: string | null = null;

      if (prop.reno_phase) {
        // Si es 'reno-budget' (legacy), intentar mapear desde Set Up Status primero
        if (prop.reno_phase === 'reno-budget') {
          const mappedFromStatus = mapSetUpStatusToKanbanPhase(prop['Set Up Status']);
          if (mappedFromStatus && mappedFromStatus !== 'reno-budget') {
            kanbanPhase = mappedFromStatus;
          } else {
            kanbanPhase = 'reno-budget';
          }
        } else if (prop.reno_phase === 'orphaned') {
          // Las propiedades 'orphaned' no están en ninguna vista de Airtable
          // y no deberían aparecer en el kanban, así que las ignoramos
          return; // Skip this property
        } else {
          const validPhases = [
            'upcoming-settlements',
            'initial-check',
            'reno-budget-renovator',
            'reno-budget-client',
            'reno-budget-start',
            'reno-in-progress',
            'furnishing-cleaning',
            'final-check',
            'reno-fixes',
            'done',
          ];
          if (validPhases.includes(prop.reno_phase)) {
            kanbanPhase = prop.reno_phase;
          }
        }
      }

      // Si no hay reno_phase o no se pudo determinar, usar el mapeo de Set Up Status
      if (!kanbanPhase) {
        kanbanPhase = mapSetUpStatusToKanbanPhase(prop['Set Up Status']);
      }

      if (kanbanPhase && kanbanPhase in grouped) {
        grouped[kanbanPhase].push(prop.id);
      }
    });

    // Mostrar conteos
    console.log('📊 Conteos por fase:');
    console.log('='.repeat(60));
    Object.entries(grouped).forEach(([phase, ids]) => {
      console.log(`${phase.padEnd(30)}: ${ids.length.toString().padStart(3)} propiedades`);
    });

    // Verificar suma total
    const totalGrouped = Object.values(grouped).reduce((sum, ids) => sum + ids.length, 0);
    console.log('\n' + '='.repeat(60));
    console.log(`Total agrupado: ${totalGrouped}`);
    console.log(`Total en BD: ${properties.length}`);
    console.log(`Diferencia: ${properties.length - totalGrouped}`);

    // Mostrar duplicados si hay
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Propiedades duplicadas encontradas: ${duplicates.length}`);
      duplicates.forEach(id => console.log(`  - ${id}`));
    }

    // Mostrar propiedades que no se pudieron asignar a ninguna fase
    const unassigned = properties.filter((p: any) => {
      const ids = Object.values(grouped).flat();
      return !ids.includes(p.id) && !duplicates.includes(p.id);
    });

    if (unassigned.length > 0) {
      console.log(`\n⚠️  Propiedades sin fase asignada: ${unassigned.length}`);
      unassigned.slice(0, 10).forEach((p: any) => {
        console.log(`  - ${p.id}: reno_phase="${p.reno_phase}", Set Up Status="${p['Set Up Status']}"`);
      });
    }

    // Mostrar detalles de upcoming-settlements si hay más de 10
    if (grouped['upcoming-settlements'].length > 10) {
      console.log(`\n⚠️  upcoming-settlements tiene ${grouped['upcoming-settlements'].length} propiedades (esperado: 10)`);
      console.log('Primeras 15 propiedades:');
      grouped['upcoming-settlements'].slice(0, 15).forEach((id, index) => {
        const prop = properties.find((p: any) => p.id === id);
        if (prop) {
          console.log(`  ${index + 1}. ${id}: reno_phase="${prop.reno_phase}", Set Up Status="${prop['Set Up Status']}"`);
        }
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

