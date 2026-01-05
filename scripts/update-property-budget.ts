#!/usr/bin/env tsx
/**
 * Script para actualizar el budget_pdf_url de una propiedad desde Airtable
 * y luego llamar al webhook de n8n para extraer categorías
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId } from '@/lib/airtable/client';
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '@/lib/n8n/webhook-caller';
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

async function updatePropertyBudget(propertyId: string) {
  console.log(`🔄 Actualizando budget_pdf_url para: ${propertyId}\n`);

  const supabase = createAdminClient();
  const base = getAirtableBase();

  if (!base) {
    console.error('❌ Error: No se pudo inicializar Airtable. Verifica las variables de entorno.');
    process.exit(1);
  }

  try {
    // 1. Obtener la propiedad de Supabase
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('❌ Error obteniendo propiedad:', propertyError);
      return;
    }

    console.log(`📋 Propiedad encontrada: ${property.address || 'Sin dirección'}`);
    console.log(`   Budget actual: ${property.budget_pdf_url || 'No tiene'}\n`);

    // 2. Buscar el record en Transactions
    const uniqueId = property['Unique ID From Engagements'] || propertyId;
    console.log(`🔍 Buscando record en Transactions para: ${uniqueId}`);

    const transactionsRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);

    if (!transactionsRecordId) {
      console.error(`❌ No se encontró record en Transactions para ${uniqueId}`);
      return;
    }

    console.log(`✅ Record encontrado: ${transactionsRecordId}\n`);

    // 3. Obtener el campo "TECH - Budget Attachment (URLs)" desde Transactions
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
        console.log(`✅ Campo encontrado por nombre: ${budgetUrlsField}`);
      }
    }

    if (!budgetField || (typeof budgetField === 'string' && budgetField.trim().length === 0)) {
      console.error('❌ No hay budget en Airtable para esta propiedad');
      return;
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
      console.error('❌ El campo budget no contiene URLs válidas');
      return;
    }

    console.log(`📄 Budget encontrado en Airtable:`);
    console.log(`   ${budgetUrl.substring(0, 100)}${budgetUrl.length > 100 ? '...' : ''}\n`);

    // 4. Comparar con el budget actual
    if (property.budget_pdf_url === budgetUrl) {
      console.log('ℹ️  El budget en Supabase ya está actualizado con el valor de Airtable\n');
    } else {
      console.log('🔄 Actualizando budget_pdf_url en Supabase...');
      
      // Actualizar en Supabase
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          budget_pdf_url: budgetUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (updateError) {
        console.error(`❌ Error actualizando en Supabase: ${updateError.message}`);
        return;
      }

      console.log(`✅ Budget actualizado exitosamente en Supabase\n`);
    }

    // 5. Llamar al webhook de n8n para extraer categorías
    console.log('📤 Llamando webhook de n8n para extraer categorías...\n');

    const payload = prepareWebhookPayload(property as any);
    if (!payload) {
      console.error('❌ No se pudo preparar payload para el webhook');
      return;
    }

    // Actualizar el payload con el nuevo budget URL
    payload.budget_pdf_url = budgetUrl.split(',')[0].trim();

    const success = await callN8nCategoriesWebhook(payload);

    if (success) {
      console.log('\n✅ Webhook llamado exitosamente');
      console.log('⏳ El workflow de n8n está procesando el PDF y extraerá las categorías automáticamente\n');
    } else {
      console.log('\n❌ Error llamando al webhook');
    }

  } catch (error: any) {
    console.error('❌ Error procesando propiedad:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Obtener el ID de la propiedad desde los argumentos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona el ID de la propiedad');
  console.log('Uso: npx tsx scripts/update-property-budget.ts <PROPERTY_ID>');
  process.exit(1);
}

updatePropertyBudget(propertyId)
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
