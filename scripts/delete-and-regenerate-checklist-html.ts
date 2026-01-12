#!/usr/bin/env tsx
/**
 * Script para eliminar y regenerar el HTML del checklist
 * Uso: npx tsx scripts/delete-and-regenerate-checklist-html.ts SP-TJP-JXR-005643 initial
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const propertyId = process.argv[2] || 'SP-TJP-JXR-005643';
  const type = process.argv[3] || 'initial';
  
  console.log(`🗑️  Eliminando HTML anterior para ${propertyId}/${type}...`);
  
  const supabase = createAdminClient();
  const storagePath = `${propertyId}/${type}/checklist.html`;
  
  // Eliminar archivo
  const { error: deleteError } = await supabase.storage
    .from('checklists')
    .remove([storagePath]);
  
  if (deleteError) {
    console.warn('⚠️  Error eliminando archivo (puede que no exista):', deleteError.message);
  } else {
    console.log(`✅ Archivo eliminado: ${storagePath}`);
  }
  
  // Regenerar usando la API
  console.log(`\n🔄 Regenerando HTML con nuevo diseño...`);
  try {
    const response = await fetch('http://localhost:3000/api/regenerate-checklist-html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId,
        type,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al regenerar HTML');
    }
    
    const data = await response.json();
    console.log(`✅ HTML regenerado exitosamente:`);
    console.log(`   URL pública: ${data.publicUrl}`);
    console.log(`   URL Storage: ${data.storageUrl}`);
  } catch (error: any) {
    console.error('❌ Error regenerando HTML:', error.message);
    process.exit(1);
  }
}

main();
