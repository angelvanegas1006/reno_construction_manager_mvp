#!/usr/bin/env tsx
/**
 * Script para ver los campos disponibles en las tablas relacionadas
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
  console.log('🔍 Obteniendo campos de tablas relacionadas...\n');

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
    const propertiesLinks = mainRecord.fields['Properties'];
    const engagementsLinks = mainRecord.fields['Engagements'];

    console.log('📋 IDs de relaciones encontrados:');
    console.log(`   Properties: ${Array.isArray(propertiesLinks) ? propertiesLinks[0] : 'N/A'}`);
    console.log(`   Engagements: ${Array.isArray(engagementsLinks) ? engagementsLinks[0] : 'N/A'}\n`);

    // Obtener registro de Properties
    if (Array.isArray(propertiesLinks) && propertiesLinks.length > 0) {
      const propertyId = propertiesLinks[0];
      console.log(`🔍 Obteniendo registro de Properties (ID: ${propertyId})...\n`);
      
      try {
        const propertyRecord = await base('Properties')
          .find(propertyId);
        
        console.log('📋 Campos disponibles en Properties:');
        console.log(JSON.stringify(Object.keys(propertyRecord.fields), null, 2));
        console.log('\n📝 Valores de campos que necesitamos:');
        console.log(`   Area Cluster: ${propertyRecord.fields['Area Cluster'] || propertyRecord.fields['Area cluster'] || '❌ NO ENCONTRADO'}`);
        console.log(`   Property Unique ID: ${propertyRecord.fields['Property Unique ID'] || propertyRecord.fields['Property UniqueID'] || '❌ NO ENCONTRADO'}`);
        console.log(`   Responsible Owner: ${propertyRecord.fields['Responsible Owner'] || '❌ NO ENCONTRADO'}`);
        console.log(`   Technical Constructor: ${propertyRecord.fields['Technical Constructor'] || propertyRecord.fields['Technical construction'] || '❌ NO ENCONTRADO'}`);
      } catch (error: any) {
        console.error(`❌ Error obteniendo Properties: ${error.message}`);
      }
    }

    // Obtener registro de Engagements
    if (Array.isArray(engagementsLinks) && engagementsLinks.length > 0) {
      const engagementId = engagementsLinks[0];
      console.log(`\n🔍 Obteniendo registro de Engagements (ID: ${engagementId})...\n`);
      
      try {
        const engagementRecord = await base('Engagements')
          .find(engagementId);
        
        console.log('📋 Campos disponibles en Engagements:');
        console.log(JSON.stringify(Object.keys(engagementRecord.fields), null, 2));
        console.log('\n📝 Valores de campos que necesitamos:');
        console.log(`   Hubspot ID: ${engagementRecord.fields['Hubspot ID'] || engagementRecord.fields['HubSpot - Engagement ID'] || '❌ NO ENCONTRADO'}`);
      } catch (error: any) {
        console.error(`❌ Error obteniendo Engagements: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();


