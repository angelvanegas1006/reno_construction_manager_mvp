/**
 * Script para importar propiedades de producción a desarrollo
 * 
 * Uso:
 * 1. Configura las variables de entorno o edita este archivo
 * 2. Ejecuta: node scripts/import-properties-from-prod.js
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURACIÓN - Edita estas URLs y keys
// ============================================

// PRODUCCIÓN (de donde vamos a leer)
const PROD_URL = 'https://fxmobdtjazijugpzkadn.supabase.co';
const PROD_KEY = process.env.PROD_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bW9iZHRqYXppanVncHprYWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDM2MzMsImV4cCI6MjA2MjE3OTYzM30.H2WZTVxTRvd_LRI4r0QPSWsQHzaWgEuKw10NAXzuZ1c';

// DESARROLLO (donde vamos a escribir)
// Usar service_role key para evitar problemas de RLS durante importación
const DEV_URL = 'https://kqqobbxjyrdputngvxrf.supabase.co';
const DEV_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || 
                process.env.DEV_SUPABASE_KEY || 
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcW9iYnhqeXJkcHV0bmd2eHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzE0NzgsImV4cCI6MjA3OTIwNzQ3OH0.of3EoJbCzV6C93H3vO1yPV5zh76HzXYeYavWp7ZjSv8';

console.log('⚠️  Usando anon key. Si hay errores de RLS, configura DEV_SUPABASE_SERVICE_ROLE_KEY');

const prodClient = createClient(PROD_URL, PROD_KEY);
const devClient = createClient(DEV_URL, DEV_KEY);

async function importProperties() {
  try {
    console.log('📥 Exportando propiedades de producción...');
    console.log(`   URL: ${PROD_URL}`);
    
    // Obtener propiedades de producción
    const { data: properties, error: fetchError } = await prodClient
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Limitar a 50 para desarrollo

    if (fetchError) {
      throw new Error(`Error al obtener propiedades de producción: ${fetchError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  No hay propiedades en producción para importar');
      return;
    }

    console.log(`✅ Encontradas ${properties.length} propiedades en producción`);
    console.log('');

    // Obtener estructura de la tabla de desarrollo para saber qué columnas existen
    const { data: devColumns, error: columnsError } = await devClient
      .from('properties')
      .select('*')
      .limit(0);
    
    // Lista de columnas que sabemos que existen en desarrollo (basado en la creación de la tabla)
    const allowedColumns = [
      'id', 'address', 'airtable_property_id', 'area_cluster', 'bathrooms', 'bedrooms',
      'budget_pdf_url', 'Client email', 'Client Name', 'created_at', 'drive_folder_id',
      'drive_folder_url', 'estimated_end_date', 'garage', 'has_elevator', 'Hubspot ID',
      'last_update', 'name', 'needs_foreman_notification', 'next_update', 'notes',
      'renovation_type', 'Renovator name', 'Set Up Status', 'square_meters', 'start_date',
      'status', 'team', 'Technical construction', 'type', 'Unique ID From Engagements',
      'updated_at', 'updated_by', 'Estimated Visit Date', 'Real Settlement Date',
      'Estimated Final Visit Date', 'Real Completion Date', 'Setup Status Notes'
    ];
    
    // Limpiar datos y filtrar solo columnas que existen en desarrollo
    const cleanedProperties = properties.map(prop => {
      const cleaned = {};
      
      // Solo incluir columnas permitidas
      allowedColumns.forEach(col => {
        if (prop[col] !== undefined) {
          cleaned[col] = prop[col];
        }
      });
      
      // Asegurar que id existe
      if (!cleaned.id) {
        cleaned.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Limpiar campos problemáticos
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === null || cleaned[key] === undefined) {
          // Mantener null para campos opcionales
        } else if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
          cleaned[key] = null;
        }
      });
      
      return cleaned;
    });

    // Insertar en desarrollo
    console.log('📤 Importando propiedades a desarrollo...');
    console.log(`   URL: ${DEV_URL}`);
    console.log('');
    
    // Insertar en lotes de 10 para evitar timeouts
    const batchSize = 10;
    let imported = 0;
    
    for (let i = 0; i < cleanedProperties.length; i += batchSize) {
      const batch = cleanedProperties.slice(i, i + batchSize);
      
      const { data: insertedData, error: insertError } = await devClient
        .from('properties')
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (insertError) {
        console.error(`❌ Error al insertar lote ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        console.error('   Propiedades problemáticas:', batch.map(p => p.id).join(', '));
        continue;
      }

      imported += insertedData?.length || 0;
      console.log(`   ✅ Lote ${Math.floor(i / batchSize) + 1}: ${insertedData?.length || 0} propiedades importadas`);
    }

    console.log('');
    console.log('🎉 ¡Importación completada!');
    console.log(`   Total importadas: ${imported} de ${properties.length} propiedades`);
    console.log('');
    console.log('Ahora puedes probar la aplicación con datos reales de producción.');

  } catch (error) {
    console.error('');
    console.error('❌ Error durante la importación:', error.message);
    if (error.details) {
      console.error('   Detalles:', error.details);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    console.error('');
    process.exit(1);
  }
}

// Ejecutar importación
console.log('');
console.log('🚀 Iniciando importación de propiedades...');
console.log('');
importProperties();
