#!/usr/bin/env tsx
/**
 * Script para encontrar los campos faltantes en las tablas relacionadas
 */

import Airtable from 'airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function main() {
  console.log('🔍 Buscando campos faltantes...\n');

  try {
    // Obtener un registro de la tabla principal para obtener IDs de relaciones
    const mainRecords = await base('tblmX19OTsj3cTHmA')
      .select({
        view: 'viwpYQ0hsSSdFrSD1',
        maxRecords: 1,
      })
      .firstPage();

    if (mainRecords.length === 0) {
      console.log('❌ No se encontraron registros');
      return;
    }

    const mainRecord = mainRecords[0];
    
    // Buscar campos relacionados que puedan tener estos datos
    console.log('📋 Campos de tipo link en el registro principal:\n');
    Object.keys(mainRecord.fields).forEach(fieldName => {
      const value = mainRecord.fields[fieldName];
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        console.log(`  - ${fieldName}: ${value[0]}`);
      }
    });

    // Intentar acceder a Team Profiles
    console.log('\n🔍 Verificando tabla Team Profiles...\n');
    try {
      const teamProfilesRecords = await base('Team Profiles')
        .select({
          maxRecords: 1,
        })
        .firstPage();
      
      if (teamProfilesRecords.length > 0) {
        const teamProfile = teamProfilesRecords[0];
        console.log('✅ Tabla Team Profiles existe');
        console.log('📋 Campos disponibles:');
        console.log(JSON.stringify(Object.keys(teamProfile.fields), null, 2));
        console.log('\n📝 Valores del primer registro:');
        console.log(JSON.stringify(teamProfile.fields, null, 2));
      }
    } catch (error: any) {
      console.log(`❌ Error accediendo a Team Profiles: ${error.message}`);
    }

    // Verificar si hay un campo link a Team Profiles en el registro principal
    const teamProfilesLinks = mainRecord.fields['Team Profiles'] || 
                              mainRecord.fields['Team'] ||
                              mainRecord.fields['Coach'] ||
                              mainRecord.fields['Lead'];
    
    if (teamProfilesLinks && Array.isArray(teamProfilesLinks) && teamProfilesLinks.length > 0) {
      console.log(`\n🔍 Encontrado link a Team Profiles: ${teamProfilesLinks[0]}`);
      try {
        const teamProfile = await base('Team Profiles').find(teamProfilesLinks[0]);
        console.log('\n📋 Campos del Team Profile relacionado:');
        console.log(JSON.stringify(Object.keys(teamProfile.fields), null, 2));
        console.log('\n📝 Valores:');
        console.log(JSON.stringify(teamProfile.fields, null, 2));
      } catch (error: any) {
        console.log(`❌ Error obteniendo Team Profile: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();









