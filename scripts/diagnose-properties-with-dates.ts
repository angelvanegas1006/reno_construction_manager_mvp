/**
 * Script de diagnóstico para ver propiedades con fecha y su fase actual
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function diagnoseProperties() {
  console.log('🔍 Diagnosing properties with Estimated Visit Date...\n');
  
  const supabase = createAdminClient();
  
  try {
    // Buscar todas las propiedades con fecha
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, "Estimated Visit Date", reno_phase, "Set Up Status", airtable_property_id')
      .not('Estimated Visit Date', 'is', null)
      .order('reno_phase');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ No properties with Estimated Visit Date found');
      return;
    }
    
    console.log(`📊 Found ${properties.length} properties with Estimated Visit Date\n`);
    
    // Agrupar por fase
    const byPhase: Record<string, typeof properties> = {};
    properties.forEach(p => {
      const phase = p.reno_phase || 'null';
      if (!byPhase[phase]) {
        byPhase[phase] = [];
      }
      byPhase[phase].push(p);
    });
    
    console.log('📋 Properties grouped by reno_phase:');
    console.log('='.repeat(60));
    Object.entries(byPhase).forEach(([phase, props]) => {
      console.log(`\n${phase}: ${props.length} properties`);
      props.forEach(p => {
        const setUpStatus = p['Set Up Status'] || 'null';
        console.log(`  - ${p.id}: Set Up Status = "${setUpStatus}"`);
      });
    });
    
    // Identificar propiedades que deberían estar en initial-check
    console.log('\n\n⚠️  Properties that should be in initial-check:');
    console.log('='.repeat(60));
    const shouldBeInInitialCheck = properties.filter(p => {
      const phase = p.reno_phase;
      const setUpStatus = (p['Set Up Status'] || '').toLowerCase().trim();
      return phase !== 'initial-check' && 
             setUpStatus !== 'initial check' && 
             setUpStatus !== 'check inicial';
    });
    
    if (shouldBeInInitialCheck.length === 0) {
      console.log('✅ All properties with dates are correctly in initial-check phase');
    } else {
      console.log(`Found ${shouldBeInInitialCheck.length} properties that need migration:\n`);
      shouldBeInInitialCheck.forEach(p => {
        console.log(`  - ${p.id}`);
        console.log(`    Current reno_phase: ${p.reno_phase || 'null'}`);
        console.log(`    Current Set Up Status: ${p['Set Up Status'] || 'null'}`);
        console.log(`    Estimated Visit Date: ${p['Estimated Visit Date']}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

diagnoseProperties()
  .then(() => {
    console.log('\n✨ Diagnosis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

