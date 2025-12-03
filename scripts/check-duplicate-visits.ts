/**
 * Script para verificar visitas duplicadas en property_visits
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkDuplicateVisits() {
  console.log('🔍 Verificando visitas duplicadas...\n');
  
  const supabase = createAdminClient();
  
  try {
    // Obtener todas las visitas
    const { data: visits, error } = await supabase
      .from('property_visits')
      .select('id, property_id, visit_date, visit_type, notes, created_at')
      .order('visit_date', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching visits:', error);
      return;
    }
    
    if (!visits || visits.length === 0) {
      console.log('⚠️  No visits found');
      return;
    }
    
    console.log(`📊 Total visits: ${visits.length}\n`);
    
    // Agrupar por property_id, visit_date y visit_type para encontrar duplicados
    const grouped = new Map<string, any[]>();
    
    visits.forEach(visit => {
      // Crear una clave única basada en property_id, fecha (solo día) y tipo
      const visitDate = new Date(visit.visit_date);
      const dateKey = visitDate.toISOString().split('T')[0]; // Solo la fecha sin hora
      const key = `${visit.property_id}-${dateKey}-${visit.visit_type}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(visit);
    });
    
    // Encontrar duplicados
    const duplicates: Array<{ key: string; visits: any[] }> = [];
    grouped.forEach((visitList, key) => {
      if (visitList.length > 1) {
        duplicates.push({ key, visits: visitList });
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate visits found');
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.length} groups of duplicate visits:\n`);
    
    duplicates.forEach((dup, index) => {
      const [propertyId, date, type] = dup.key.split('-');
      console.log(`${index + 1}. Property: ${propertyId}, Date: ${date}, Type: ${type}`);
      console.log(`   Duplicates: ${dup.visits.length}`);
      dup.visits.forEach((v, i) => {
        const visitDate = new Date(v.visit_date);
        console.log(`   ${i + 1}. ID: ${v.id}, Time: ${visitDate.toLocaleTimeString()}, Created: ${new Date(v.created_at).toLocaleString()}`);
      });
      console.log('');
    });
    
    // Obtener propiedades para mostrar direcciones
    const propertyIds = Array.from(new Set(duplicates.map(d => d.key.split('-')[0])));
    const { data: properties } = await supabase
      .from('properties')
      .select('id, address')
      .in('id', propertyIds);
    
    const propertyMap = new Map(properties?.map(p => [p.id, p.address]) || []);
    
    console.log('\n📋 Summary by property:');
    duplicates.forEach(dup => {
      const propertyId = dup.key.split('-')[0];
      const address = propertyMap.get(propertyId) || 'N/A';
      console.log(`   ${propertyId}: ${address} - ${dup.visits.length} duplicates`);
    });
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  }
}

checkDuplicateVisits()
  .then(() => {
    console.log('\n✨ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });






