#!/usr/bin/env tsx
/**
 * Script para sincronizar budget_pdf_url desde Airtable a Supabase
 * para propiedades en reno-in-progress que no tienen budget_pdf_url
 * 
 * Ejecutar con: npx tsx scripts/sync-budget-from-airtable.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId } from '@/lib/airtable/client';
import * as fs from 'fs';
import * as path from 'path';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Field ID del campo "TECH - Budget Attachment (URLs)" en Transactions
const BUDGET_ATTACHMENT_FIELD_ID = 'fldVOO4zqx5HUzIjz';

// Inicializar Airtable
const getAirtableBase = () => {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return null;
  }

  return new Airtable({ apiKey }).base(baseId);
};

interface SyncResult {
  propertyId: string;
  address: string;
  success: boolean;
  budgetUrl: string | null;
  error?: string;
}

async function syncBudgetFromAirtable() {
  console.log('🔄 Sincronizando budget_pdf_url desde Airtable...\n');

  const supabase = createAdminClient();
  const base = getAirtableBase();

  if (!base) {
    console.error('❌ Error: No se pudo inicializar Airtable. Verifica las variables de entorno.');
    process.exit(1);
  }

  try {
    // 1. Obtener todas las propiedades en reno-in-progress sin budget_pdf_url
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", budget_pdf_url')
      .eq('reno_phase', 'reno-in-progress')
      .or('budget_pdf_url.is.null,budget_pdf_url.eq.')
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('❌ Error obteniendo propiedades:', propertiesError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No hay propiedades en reno-in-progress sin budget_pdf_url');
      return;
    }

    console.log(`📊 Total de propiedades a sincronizar: ${properties.length}\n`);

    const results: SyncResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // 2. Para cada propiedad, buscar el budget en Airtable
    for (const property of properties) {
      const uniqueId = property['Unique ID From Engagements'] || property.id;
      
      console.log(`\n🔍 Procesando: ${property.id} (${property.address || 'Sin dirección'})`);

      try {
        // Buscar el record ID de Transactions usando el Unique ID
        const transactionsRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);

        if (!transactionsRecordId) {
          console.log(`   ⚠️  No se encontró record en Transactions para ${uniqueId}`);
          results.push({
            propertyId: property.id,
            address: property.address || 'Sin dirección',
            success: false,
            budgetUrl: null,
            error: 'No se encontró record en Transactions'
          });
          skippedCount++;
          continue;
        }

        // Obtener el campo "TECH - Budget Attachment (URLs)" desde Transactions
        const record = await base('Transactions').find(transactionsRecordId);
        
        // Obtener el campo por field ID (fldVOO4zqx5HUzIjz) o por nombre
        let budgetField = record.fields[BUDGET_ATTACHMENT_FIELD_ID] as any;
        
        // Si no se encuentra por ID, intentar por nombre específico "TECH - Budget Attachment (URLs)"
        if (!budgetField) {
          const fieldKeys = Object.keys(record.fields);
          const budgetUrlsField = fieldKeys.find(key => 
            key === 'TECH - Budget Attachment (URLs)' ||
            (key.includes('Budget Attachment') && key.includes('URLs'))
          );
          if (budgetUrlsField) {
            budgetField = record.fields[budgetUrlsField];
          }
        }

        if (!budgetField || (typeof budgetField === 'string' && budgetField.trim().length === 0)) {
          console.log(`   ⚠️  No hay budget en Airtable para esta propiedad`);
          results.push({
            propertyId: property.id,
            address: property.address || 'Sin dirección',
            success: false,
            budgetUrl: null,
            error: 'No hay budget en Airtable'
          });
          skippedCount++;
          continue;
        }

        // Procesar el campo budget (puede ser string o array)
        let budgetUrl: string | null = null;

        if (typeof budgetField === 'string') {
          // Si es un string, puede tener múltiples URLs separadas por comas
          const urls = budgetField
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
          
          budgetUrl = urls.length > 0 ? urls.join(',') : null;
        } else if (Array.isArray(budgetField)) {
          // Si es un array, extraer URLs
          const urls = budgetField
            .map(item => {
              if (typeof item === 'string') {
                return item.trim();
              } else if (typeof item === 'object' && item !== null && item.url) {
                return item.url;
              }
              return null;
            })
            .filter((url): url is string => url !== null && url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
          
          budgetUrl = urls.length > 0 ? urls.join(',') : null;
        }

        if (!budgetUrl) {
          console.log(`   ⚠️  El campo budget no contiene URLs válidas`);
          results.push({
            propertyId: property.id,
            address: property.address || 'Sin dirección',
            success: false,
            budgetUrl: null,
            error: 'El campo budget no contiene URLs válidas'
          });
          skippedCount++;
          continue;
        }

        // Actualizar en Supabase
        const { error: updateError } = await supabase
          .from('properties')
          .update({ 
            budget_pdf_url: budgetUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', property.id);

        if (updateError) {
          console.log(`   ❌ Error actualizando en Supabase: ${updateError.message}`);
          results.push({
            propertyId: property.id,
            address: property.address || 'Sin dirección',
            success: false,
            budgetUrl: budgetUrl,
            error: updateError.message
          });
          errorCount++;
        } else {
          console.log(`   ✅ Budget sincronizado: ${budgetUrl.substring(0, 80)}${budgetUrl.length > 80 ? '...' : ''}`);
          results.push({
            propertyId: property.id,
            address: property.address || 'Sin dirección',
            success: true,
            budgetUrl: budgetUrl
          });
          successCount++;
        }

        // Pequeña pausa para no sobrecargar Airtable
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.log(`   ❌ Error procesando propiedad: ${error.message}`);
        results.push({
          propertyId: property.id,
          address: property.address || 'Sin dirección',
          success: false,
          budgetUrl: null,
          error: error.message
        });
        errorCount++;
      }
    }

    // 3. Generar informe
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📋 RESUMEN DE SINCRONIZACIÓN');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`✅ Sincronizadas exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`⚠️  Omitidas (sin budget en Airtable): ${skippedCount}`);
    console.log(`📊 Total procesadas: ${properties.length}\n`);

    // Mostrar propiedades sincronizadas exitosamente
    if (successCount > 0) {
      console.log('✅ PROPIEDADES SINCRONIZADAS EXITOSAMENTE:');
      console.log('─'.repeat(80));
      results
        .filter(r => r.success)
        .forEach((r, index) => {
          const urlPreview = r.budgetUrl ? r.budgetUrl.substring(0, 60) + '...' : 'N/A';
          console.log(`${index + 1}. ${r.propertyId} - ${r.address}`);
          console.log(`   Budget: ${urlPreview}`);
        });
      console.log('');
    }

    // Mostrar errores
    if (errorCount > 0) {
      console.log('❌ ERRORES:');
      console.log('─'.repeat(80));
      results
        .filter(r => !r.success && r.error)
        .forEach((r, index) => {
          console.log(`${index + 1}. ${r.propertyId} - ${r.address}`);
          console.log(`   Error: ${r.error}`);
        });
      console.log('');
    }

    // Mostrar omitidas
    if (skippedCount > 0) {
      console.log('⚠️  OMITIDAS (sin budget en Airtable):');
      console.log('─'.repeat(80));
      results
        .filter(r => !r.success && r.error && r.error.includes('No hay budget'))
        .forEach((r, index) => {
          console.log(`${index + 1}. ${r.propertyId} - ${r.address}`);
        });
      console.log('');
    }

    // 4. Generar archivo CSV con resultados
    const reportsDir = path.join(projectDir, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const csvFileName = `budget-sync-results-${dateStr}.csv`;
    const csvFilePath = path.join(reportsDir, csvFileName);

    const csvHeaders = [
      'ID',
      'Dirección',
      'Estado',
      'Budget URL',
      'Error'
    ];

    const csvRows = results.map(r => [
      r.propertyId,
      `"${r.address.replace(/"/g, '""')}"`,
      r.success ? '✅ Sincronizado' : '❌ Error',
      r.budgetUrl || 'N/A',
      r.error || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

    console.log('📄 Archivo CSV generado:');
    console.log(`   ${csvFilePath}\n`);

    console.log('✅ Script finalizado\n');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  }
}

// Ejecutar
syncBudgetFromAirtable()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
