/**
 * Script para verificar las fechas de Estimated Visit Date en propiedades de Initial Check
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkInitialCheckDates() {
  console.log('🔍 Verificando fechas de Estimated Visit Date en Initial Check...\n');
  
  const supabase = createAdminClient();
  
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, address, "Estimated Visit Date", "Set Up Status", reno_phase')
      .eq('reno_phase', 'initial-check');
    
    if (error) {
      console.error('❌ Error fetching properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️  No properties found in initial-check phase');
      return;
    }
    
    type PropertyWithDate = { 
      id: string; 
      address: string | null; 
      'Estimated Visit Date': string | null; 
      'Set Up Status': string | null; 
      reno_phase: string | null;
    };
    
    const typedProperties = properties as unknown as PropertyWithDate[];
    
    console.log(`📊 Found ${typedProperties.length} properties in initial-check phase:\n`);
    
    typedProperties.forEach((p, index) => {
      console.log(`${index + 1}. ${p.id}`);
      console.log(`   Address: ${p.address || 'N/A'}`);
      console.log(`   Estimated Visit Date: ${p['Estimated Visit Date'] || '❌ NO DATE'}`);
      console.log(`   Set Up Status: ${p['Set Up Status'] || 'N/A'}`);
      console.log('');
    });
    
    const withDates = typedProperties.filter(p => p['Estimated Visit Date']);
    const withoutDates = typedProperties.filter(p => !p['Estimated Visit Date']);
    
    console.log('\n📈 Summary:');
    console.log(`   Properties with dates: ${withDates.length}`);
    console.log(`   Properties without dates: ${withoutDates.length}`);
    
    if (withoutDates.length > 0) {
      console.log('\n⚠️  Properties missing Estimated Visit Date:');
      withoutDates.forEach(p => console.log(`   - ${p.id}`));
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  }
}

checkInitialCheckDates()
  .then(() => {
    console.log('\n✨ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

