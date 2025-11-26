/**
 * Script para corregir la fase de propiedades específicas
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function fixPropertiesPhase() {
  console.log('🔧 Fixing properties phase...\n');
  
  const supabase = createAdminClient();
  const propertyIds = ['SP-IAF-PD1-004572', 'SP-KRP-2YS-003768'];
  
  try {
    // Obtener información de las propiedades
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status", "Estimated Visit Date", airtable_property_id')
      .in('id', propertyIds);
    
    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('❌ Properties not found');
      return;
    }
    
    type PropertyWithDate = { 
      id: string; 
      reno_phase: string | null; 
      'Set Up Status': string | null; 
      'Estimated Visit Date': string | null; 
      airtable_property_id: string | null;
    };
    
    const typedProperties = properties as unknown as PropertyWithDate[];
    
    console.log('📋 Current state of properties:');
    typedProperties.forEach(p => {
      console.log(`\n  ${p.id}:`);
      console.log(`    Current phase: ${p.reno_phase}`);
      console.log(`    Set Up Status: ${p['Set Up Status'] || 'null'}`);
      console.log(`    Estimated Visit Date: ${p['Estimated Visit Date'] || 'NO DATE'}`);
      console.log(`    Airtable ID: ${p.airtable_property_id || 'null'}`);
    });
    
    // Mover a upcoming-settlements
    console.log('\n🔄 Moving properties to upcoming-settlements...');
    
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        reno_phase: 'upcoming-settlements',
        'Set Up Status': 'Pending to visit',
        updated_at: new Date().toISOString(),
      })
      .in('id', propertyIds);
    
    if (updateError) {
      console.error('❌ Error updating properties:', updateError);
      return;
    }
    
    console.log('✅ Successfully moved properties to upcoming-settlements');
    
    // Verificar el resultado
    const { data: updatedProperties } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status"')
      .in('id', propertyIds);
    
    type UpdatedProperty = { 
      id: string; 
      reno_phase: string | null; 
      'Set Up Status': string | null;
    };
    
    const typedUpdatedProperties = (updatedProperties || []) as unknown as UpdatedProperty[];
    
    console.log('\n📋 Updated state:');
    typedUpdatedProperties.forEach(p => {
      console.log(`  ${p.id}: ${p.reno_phase} (Set Up Status: ${p['Set Up Status']})`);
    });
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  }
}

fixPropertiesPhase()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

