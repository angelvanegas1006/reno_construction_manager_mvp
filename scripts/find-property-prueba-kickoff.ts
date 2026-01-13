#!/usr/bin/env tsx
/**
 * Script para buscar la propiedad "Prueba Kick Off" en Airtable
 * y verificar por qué no se está sincronizando
 */

import Airtable from 'airtable';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA'; // Transactions table ID

async function main() {
  console.log('🔍 Buscando propiedad "Prueba Kick Off" en Airtable...\n');

  try {
    // Buscar en la tabla Transactions
    console.log('📋 Buscando en tabla Transactions...');
    const transactionsRecords: any[] = [];
    
    await base('Transactions')
      .select({
        filterByFormula: `SEARCH("Prueba Kick Off", {Transaction name}) > 0`,
        maxRecords: 10,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          transactionsRecords.push(record);
        });
        fetchNextPage();
      });

    if (transactionsRecords.length > 0) {
      console.log(`✅ Encontradas ${transactionsRecords.length} transacciones con "Prueba Kick Off"\n`);
      
      transactionsRecords.forEach((record, index) => {
        console.log(`\n📝 Registro ${index + 1}:`);
        console.log(`   Record ID: ${record.id}`);
        console.log(`   Transaction name: ${record.fields['Transaction name'] || 'N/A'}`);
        console.log(`   Unique ID (From Engagements): ${record.fields['UNIQUEID (from Engagements)'] || record.fields['Unique ID (From Engagements)'] || record.fields['Unique ID From Engagements'] || 'N/A'}`);
        console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
        console.log(`   Set Up Status: ${record.fields['Set up status'] || record.fields['Set Up Status'] || 'N/A'}`);
        console.log(`   Type: ${record.fields['Type'] || 'N/A'}`);
        console.log(`   Test Flag: ${record.fields['Test Flag'] || 'N/A'}`);
        console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
        
        // Verificar si está en alguna view
        console.log(`\n   🔍 Verificando si está en alguna view configurada...`);
      });
    } else {
      console.log('❌ No se encontró en Transactions con "Transaction name"\n');
      
      // Intentar buscar por otros campos
      console.log('🔍 Buscando por otros campos...');
      const allRecords: any[] = [];
      
      await base('Transactions')
        .select({
          filterByFormula: `SEARCH("Kick Off", CONCATENATE({Transaction name}, {Address})) > 0`,
          maxRecords: 20,
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            allRecords.push(record);
          });
          fetchNextPage();
        });
      
      if (allRecords.length > 0) {
        console.log(`⚠️  Encontradas ${allRecords.length} transacciones con "Kick Off" en otros campos:\n`);
        allRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. Transaction name: ${record.fields['Transaction name'] || 'N/A'}`);
          console.log(`      Address: ${record.fields['Address'] || 'N/A'}`);
          console.log(`      Unique ID: ${record.fields['UNIQUEID (from Engagements)'] || record.fields['Unique ID (From Engagements)'] || 'N/A'}`);
        });
      }
    }

    // También buscar en la tabla Properties si existe
    console.log('\n📋 Buscando en tabla Properties...');
    try {
      const propertiesRecords: any[] = [];
      
      await base('Properties')
        .select({
          filterByFormula: `SEARCH("Prueba Kick Off", {Name}) > 0`,
          maxRecords: 10,
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            propertiesRecords.push(record);
          });
          fetchNextPage();
        });

      if (propertiesRecords.length > 0) {
        console.log(`✅ Encontradas ${propertiesRecords.length} propiedades con "Prueba Kick Off"\n`);
        propertiesRecords.forEach((record, index) => {
          console.log(`\n📝 Propiedad ${index + 1}:`);
          console.log(`   Record ID: ${record.id}`);
          console.log(`   Name: ${record.fields['Name'] || 'N/A'}`);
          console.log(`   Property Unique ID: ${record.fields['Property Unique ID'] || 'N/A'}`);
        });
      } else {
        console.log('❌ No se encontró en Properties\n');
      }
    } catch (error: any) {
      console.log(`⚠️  Error buscando en Properties: ${error.message}`);
    }

    // Verificar en qué views está (si está en Transactions)
    if (transactionsRecords.length > 0) {
      console.log('\n🔍 Verificando en qué views está la propiedad...\n');
      
      const views = [
        { name: 'Upcoming Settlements', viewId: 'viwpYQ0hsSSdFrSD1' },
        { name: 'Initial Check', viewId: 'viwFZZ5S3VFCfYP6g' },
        { name: 'Upcoming Reno Budget', viewId: 'viwKS3iOiyX5iu5zP' },
        { name: 'Reno In Progress', viewId: 'viwQUOrLzUrScuU4k' },
        { name: 'Furnishing', viewId: 'viw9NDUaeGIQDvugU' },
        { name: 'Final Check', viewId: 'viwnDG5TY6wjZhBL2' },
        { name: 'Cleaning', viewId: 'viwLajczYxzQd4UvU' },
      ];

      for (const view of views) {
        try {
          const viewRecords: any[] = [];
          const recordId = transactionsRecords[0].id;
          
          await base(AIRTABLE_TABLE_ID)
            .select({
              view: view.viewId,
              filterByFormula: `{Record ID} = "${recordId}"`,
              maxRecords: 1,
            })
            .eachPage((pageRecords) => {
              pageRecords.forEach((record) => {
                viewRecords.push(record);
              });
            });

          if (viewRecords.length > 0) {
            console.log(`✅ Está en view: ${view.name}`);
          } else {
            console.log(`❌ NO está en view: ${view.name}`);
          }
        } catch (error: any) {
          console.log(`⚠️  Error verificando view ${view.name}: ${error.message}`);
        }
      }
    }

    // Verificar criterios de filtro
    if (transactionsRecords.length > 0) {
      const record = transactionsRecords[0];
      const fields = record.fields;
      
      console.log('\n📊 Verificando criterios de filtro:\n');
      
      const criteria = [
        { name: 'Stage = "Presettlement & Settled"', value: fields['Stage'], expected: 'Presettlement & Settled' },
        { name: 'Set Up Status = "Pending to visit"', value: fields['Set up status'] || fields['Set Up Status'], expected: 'Pending to visit' },
        { name: 'Type = "Unit & Building"', value: fields['Type'], expected: 'Unit & Building' },
        { name: 'Test Flag != "Test"', value: fields['Test Flag'], expected: 'No debe ser "Test"' },
        { name: 'Unique ID (From Engagements) != Empty', value: fields['UNIQUEID (from Engagements)'] || fields['Unique ID (From Engagements)'] || fields['Unique ID From Engagements'], expected: 'Debe tener valor' },
      ];

      criteria.forEach((criterion) => {
        const passes = 
          (criterion.name.includes('!=') && criterion.value !== criterion.expected) ||
          (criterion.name.includes('=') && criterion.value === criterion.expected) ||
          (criterion.name.includes('Empty') && criterion.value);
        
        console.log(`${passes ? '✅' : '❌'} ${criterion.name}`);
        console.log(`   Valor actual: ${criterion.value || 'N/A'}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main();

