import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function diagnoseProgressHistory() {
  const propertyName = process.argv[2] || "Prueba Kick Off";
  
  console.log(`\n🔍 Diagnosticando historial de progreso para: "${propertyName}"\n`);
  
  const supabase = createAdminClient();
  
  // 1. Buscar la propiedad
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, address, reno_phase, "Set Up Status"')
    .ilike('address', `%${propertyName}%`);
  
  if (propError) {
    console.error('❌ Error buscando propiedad:', propError);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.error(`❌ No se encontró ninguna propiedad con nombre "${propertyName}"`);
    return;
  }
  
  const property = properties[0];
  console.log(`✅ Propiedad encontrada:`);
  console.log(`   ID: ${property.id}`);
  console.log(`   Dirección: ${property.address}`);
  console.log(`   Fase: ${property.reno_phase || 'N/A'}`);
  console.log(`   Set Up Status: ${property['Set Up Status'] || 'N/A'}`);
  
  // Verificar si está en fase posterior a reno-in-progress
  const phasesAfterRenoInProgress = [
    'furnishing',
    'final-check',
    'cleaning',
    'furnishing-cleaning',
    'reno-fixes',
    'done'
  ];
  
  const isAfterRenoInProgress = phasesAfterRenoInProgress.includes(property.reno_phase || '');
  console.log(`\n📊 Verificación de fase:`);
  console.log(`   ¿Fase > reno-in-progress?: ${isAfterRenoInProgress ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   Fase actual: ${property.reno_phase || 'N/A'}`);
  
  // 2. Verificar category_updates
  console.log(`\n📝 Verificando category_updates...`);
  const { data: categoryUpdates, error: updatesError } = await supabase
    .from('category_updates')
    .select('id, category_id, category_text, photos, videos, notes, previous_percentage, new_percentage, created_at, created_by')
    .eq('property_id', property.id)
    .order('created_at', { ascending: false });
  
  if (updatesError) {
    console.error('❌ Error obteniendo category_updates:', updatesError);
  } else {
    console.log(`   Total de updates encontrados: ${categoryUpdates?.length || 0}`);
    
    if (categoryUpdates && categoryUpdates.length > 0) {
      console.log(`\n   Últimos 5 updates:`);
      categoryUpdates.slice(0, 5).forEach((update: any, index: number) => {
        console.log(`   ${index + 1}. ${new Date(update.created_at).toLocaleString('es-ES')}`);
        console.log(`      - Categoría ID: ${update.category_id}`);
        console.log(`      - Texto: ${update.category_text ? '✅ Tiene texto' : '❌ Sin texto'}`);
        console.log(`      - Fotos: ${update.photos?.length || 0}`);
        console.log(`      - Videos: ${update.videos?.length || 0}`);
        console.log(`      - Notas: ${update.notes ? '✅' : '❌'}`);
        console.log(`      - Porcentaje: ${update.previous_percentage || 'N/A'}% → ${update.new_percentage}%`);
      });
    } else {
      console.log(`   ⚠️ No hay category_updates para esta propiedad`);
      console.log(`   Esto puede ser porque:`);
      console.log(`   - Los guardados se hicieron antes de implementar el historial`);
      console.log(`   - No se ha guardado progreso desde que se implementó el historial`);
    }
  }
  
  // 3. Verificar client_update_emails
  console.log(`\n📧 Verificando client_update_emails...`);
  const { data: updateEmails, error: emailsError } = await supabase
    .from('client_update_emails')
    .select('id, client_email, subject, sent_at, created_by, html_content')
    .eq('property_id', property.id)
    .order('sent_at', { ascending: false });
  
  if (emailsError) {
    console.error('❌ Error obteniendo client_update_emails:', emailsError);
  } else {
    console.log(`   Total de emails encontrados: ${updateEmails?.length || 0}`);
    
    if (updateEmails && updateEmails.length > 0) {
      console.log(`\n   Últimos 5 emails:`);
      updateEmails.slice(0, 5).forEach((email: any, index: number) => {
        console.log(`   ${index + 1}. ${new Date(email.sent_at).toLocaleString('es-ES')}`);
        console.log(`      - Asunto: ${email.subject || 'N/A'}`);
        console.log(`      - Cliente: ${email.client_email || 'N/A'}`);
        console.log(`      - HTML: ${email.html_content ? `✅ ${email.html_content.length} caracteres` : '❌ Sin contenido'}`);
      });
    } else {
      console.log(`   ⚠️ No hay client_update_emails para esta propiedad`);
      console.log(`   Esto puede ser porque:`);
      console.log(`   - Los emails se enviaron antes de implementar el historial`);
      console.log(`   - No se ha enviado ningún update desde que se implementó el historial`);
    }
  }
  
  // 4. Verificar categorías dinámicas
  console.log(`\n📂 Verificando categorías dinámicas...`);
  const { data: categories, error: categoriesError } = await supabase
    .from('property_dynamic_categories')
    .select('id, name, percentage')
    .eq('property_id', property.id);
  
  if (categoriesError) {
    console.error('❌ Error obteniendo categorías:', categoriesError);
  } else {
    console.log(`   Total de categorías: ${categories?.length || 0}`);
    if (categories && categories.length > 0) {
      console.log(`   Categorías:`);
      categories.forEach((cat: any) => {
        console.log(`   - ${cat.name}: ${cat.percentage || 0}%`);
      });
    }
  }
  
  // 5. Resumen y recomendaciones
  console.log(`\n📋 Resumen:`);
  console.log(`   - Fase actual: ${property.reno_phase || 'N/A'}`);
  console.log(`   - ¿Muestra historial?: ${isAfterRenoInProgress ? '✅ SÍ' : '❌ NO (la fase debe ser posterior a reno-in-progress)'}`);
  console.log(`   - Category updates: ${categoryUpdates?.length || 0}`);
  console.log(`   - Update emails: ${updateEmails?.length || 0}`);
  
  if (!isAfterRenoInProgress) {
    console.log(`\n⚠️ RECOMENDACIÓN:`);
    console.log(`   La propiedad está en fase "${property.reno_phase || 'N/A'}"`);
    console.log(`   El historial solo se muestra para fases posteriores a "reno-in-progress":`);
    console.log(`   - furnishing`);
    console.log(`   - final-check`);
    console.log(`   - cleaning`);
    console.log(`   - furnishing-cleaning`);
    console.log(`   - reno-fixes`);
    console.log(`   - done`);
  }
  
  if (isAfterRenoInProgress && (!categoryUpdates || categoryUpdates.length === 0) && (!updateEmails || updateEmails.length === 0)) {
    console.log(`\n⚠️ RECOMENDACIÓN:`);
    console.log(`   La propiedad está en una fase válida pero no hay datos de historial.`);
    console.log(`   Esto significa que los guardados/updates se hicieron ANTES de implementar el historial.`);
    console.log(`   Los nuevos guardados y updates SÍ aparecerán en el historial.`);
  }
  
  console.log(`\n`);
}

diagnoseProgressHistory().catch(console.error);

