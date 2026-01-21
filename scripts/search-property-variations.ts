/**
 * Script para buscar una propiedad con variaciones del ID
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function searchWithVariations(propertyId: string) {
  const base = getAirtableBase();
  
  console.log(`\n🔍 Buscando variaciones de "${propertyId}"...\n`);
  
  // Extraer partes del ID
  const parts = propertyId.split('-');
  const searchPatterns = [
    propertyId, // Original
    propertyId.replace(/-/g, ''), // Sin guiones
    parts.slice(0, 3).join('-'), // Primeras 3 partes
    parts.slice(-1)[0], // Última parte
    propertyId.substring(0, 10), // Primeros 10 caracteres
  ];
  
  console.log(`Patrones de búsqueda:`, searchPatterns);
  console.log('');
  
  const fieldNames = [
    'UNIQUEID (from Engagements)',
    'Unique ID (From Engagements)', 
    'Unique ID From Engagements',
    'Unique ID',
    'Property Unique ID',
  ];
  
  for (const pattern of searchPatterns) {
    if (!pattern || pattern.length < 3) continue;
    
    console.log(`Buscando "${pattern}"...`);
    
    for (const fieldName of fieldNames) {
      try {
        const records: any[] = [];
        await base(AIRTABLE_TABLE_ID)
          .select({
            filterByFormula: `SEARCH("${pattern}", {${fieldName}})`,
            maxRecords: 10,
          })
          .eachPage((pageRecords) => {
            pageRecords.forEach((r) => records.push(r));
          });
        
        if (records.length > 0) {
          console.log(`\n✅ Encontradas ${records.length} coincidencias con "${pattern}" en campo "${fieldName}":\n`);
          records.forEach((record, i) => {
            const uniqueId = 
              record.fields['UNIQUEID (from Engagements)'] ||
              record.fields['Unique ID (From Engagements)'] ||
              record.fields['Unique ID From Engagements'] ||
              record.fields['Unique ID'];
            const uniqueIdValue = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
            
            console.log(`   ${i + 1}. ${uniqueIdValue || 'N/A'}`);
            console.log(`      Address: ${record.fields['Address'] || 'N/A'}`);
            console.log(`      Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
            console.log('');
          });
        }
      } catch (error: any) {
        // Continuar
      }
    }
  }
  
  // Buscar por última parte del ID (más común)
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length >= 6) {
    console.log(`\n🔍 Buscando por última parte "${lastPart}"...\n`);
    
    try {
      const records: any[] = [];
      await base(AIRTABLE_TABLE_ID)
        .select({
          filterByFormula: `SEARCH("${lastPart}", {UNIQUEID (from Engagements)})`,
          maxRecords: 20,
        })
        .eachPage((pageRecords) => {
          pageRecords.forEach((r) => records.push(r));
        });
      
      if (records.length > 0) {
        console.log(`✅ Encontradas ${records.length} propiedades con "${lastPart}" en el Unique ID:\n`);
        records.forEach((record, i) => {
          const uniqueId = 
            record.fields['UNIQUEID (from Engagements)'] ||
            record.fields['Unique ID (From Engagements)'] ||
            record.fields['Unique ID From Engagements'] ||
            record.fields['Unique ID'];
          const uniqueIdValue = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
          
          console.log(`   ${i + 1}. ${uniqueIdValue || 'N/A'}`);
          console.log(`      Address: ${record.fields['Address'] || 'N/A'}`);
          console.log(`      Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
          console.log('');
        });
      }
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
  }
}

const propertyId = process.argv[2] || 'SP-RZ2-NQB005312';
searchWithVariations(propertyId).catch(console.error);
