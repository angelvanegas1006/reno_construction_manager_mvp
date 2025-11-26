/**
 * Script para verificar propiedades en upcoming-settlements
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkUpcomingSettlements() {
  console.log('🔍 Checking properties in upcoming-settlements phase...\n');
  
  const supabase = createAdminClient();
  
  try {
    // Buscar todas las propiedades en upcoming-settlements
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, "Estimated Visit Date", reno_phase, "Set Up Status", airtable_property_id')
      .eq('reno_phase', 'upcoming-settlements')
      .order('id');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ No properties in upcoming-settlements phase');
      return;
    }
    
    console.log(`📊 Found ${properties.length} properties in upcoming-settlements phase\n`);
    console.log('='.repeat(60));
    
    properties.forEach((p, index) => {
      console.log(`\n${index + 1}. Property ID: ${p.id}`);
      console.log(`   Estimated Visit Date: ${p['Estimated Visit Date'] || 'NO DATE'}`);
      console.log(`   Set Up Status: ${p['Set Up Status'] || 'null'}`);
      console.log(`   Airtable Property ID: ${p.airtable_property_id || 'null'}`);
      
      if (p['Estimated Visit Date']) {
        console.log(`   ⚠️  HAS DATE - Should be in initial-check!`);
      }
    });
    
    const withDates = properties.filter(p => p['Estimated Visit Date']);
    if (withDates.length > 0) {
      console.log(`\n\n⚠️  Found ${withDates.length} properties in upcoming-settlements WITH dates that should be migrated!`);
    } else {
      console.log(`\n✅ All properties in upcoming-settlements are correctly without dates`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkUpcomingSettlements()
  .then(() => {
    console.log('\n✨ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

