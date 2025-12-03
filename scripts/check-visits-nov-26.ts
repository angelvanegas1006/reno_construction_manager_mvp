/**
 * Script para verificar visitas del 26 de noviembre
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkVisitsNov26() {
  console.log('🔍 Verificando visitas del 26 de noviembre...\n');
  
  const supabase = createAdminClient();
  
  try {
    // Obtener todas las visitas del 26 de noviembre de 2025
    const startDate = new Date('2025-11-26T00:00:00Z');
    const endDate = new Date('2025-11-26T23:59:59Z');
    
    const { data: visits, error } = await supabase
      .from('property_visits')
      .select('id, property_id, visit_date, visit_type, notes, created_at')
      .gte('visit_date', startDate.toISOString())
      .lte('visit_date', endDate.toISOString())
      .order('visit_date', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching visits:', error);
      return;
    }
    
    if (!visits || visits.length === 0) {
      console.log('⚠️  No visits found for Nov 26');
      return;
    }
    
    console.log(`📊 Found ${visits.length} visits on Nov 26:\n`);
    
    // Obtener propiedades
    const propertyIds = Array.from(new Set(visits.map(v => v.property_id)));
    const { data: properties } = await supabase
      .from('properties')
      .select('id, address')
      .in('id', propertyIds);
    
    const propertyMap = new Map(properties?.map(p => [p.id, p.address]) || []);
    
    visits.forEach((visit, index) => {
      const visitDate = new Date(visit.visit_date);
      const address = propertyMap.get(visit.property_id) || 'N/A';
      console.log(`${index + 1}. ID: ${visit.id}`);
      console.log(`   Property: ${visit.property_id}`);
      console.log(`   Address: ${address}`);
      console.log(`   Date/Time: ${visitDate.toISOString()} (${visitDate.toLocaleString()})`);
      console.log(`   Type: ${visit.visit_type}`);
      console.log(`   Notes: ${visit.notes || 'N/A'}`);
      console.log(`   Created: ${new Date(visit.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Agrupar por property_id para ver duplicados
    const byProperty = new Map<string, any[]>();
    visits.forEach(visit => {
      if (!byProperty.has(visit.property_id)) {
        byProperty.set(visit.property_id, []);
      }
      byProperty.get(visit.property_id)!.push(visit);
    });
    
    console.log('\n📋 Grouped by property:');
    byProperty.forEach((visitList, propertyId) => {
      const address = propertyMap.get(propertyId) || 'N/A';
      console.log(`\n${propertyId} (${address}): ${visitList.length} visit(s)`);
      visitList.forEach((v, i) => {
        const visitDate = new Date(v.visit_date);
        console.log(`  ${i + 1}. ${visitDate.toLocaleTimeString()} - Type: ${v.visit_type}, ID: ${v.id}`);
      });
    });
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  }
}

checkVisitsNov26()
  .then(() => {
    console.log('\n✨ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });






