#!/usr/bin/env tsx
/**
 * Script para generar informe de propiedades en reno-in-progress sin informe
 * 
 * Ejecutar con: npx tsx scripts/check-properties-without-report.ts
 * 
 * Genera:
 * - Un informe en consola
 * - Un archivo CSV: reports/properties-without-report-YYYY-MM-DD.csv
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId } from '@/lib/airtable/client';
import * as fs from 'fs';
import * as path from 'path';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Inicializar Airtable
const getAirtableBase = () => {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return null;
  }

  return new Airtable({ apiKey }).base(baseId);
};

interface PropertyWithoutReport {
  id: string;
  address: string;
  fullAddress: string | null;
  'Set Up Status': string | null;
  reno_phase: string | null;
  renovator: string | null;
  created_at: string | null;
}

async function checkPropertiesWithoutReport() {
  console.log('🔍 Buscando propiedades en reno-in-progress sin informe...\n');

  const supabase = createAdminClient();

  try {
    // 1. Obtener todas las propiedades en reno-in-progress
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase, "Renovator name", created_at, budget_pdf_url, "Unique ID From Engagements"')
      .eq('reno_phase', 'reno-in-progress')
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('❌ Error obteniendo propiedades:', propertiesError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No hay propiedades en reno-in-progress');
      return;
    }

    console.log(`📊 Total de propiedades en reno-in-progress: ${properties.length}`);
    console.log(`⏳ Verificando presupuestos de reforma (budget_pdf_url)...\n`);

    // 2. Para cada propiedad, verificar si tiene presupuesto de reforma (budget_pdf_url)
    const propertiesWithoutReport: PropertyWithoutReport[] = [];
    const propertiesWithReport: string[] = [];

    for (const property of properties) {
      // Verificar si tiene budget_pdf_url (presupuesto de reforma)
      const hasBudget = property.budget_pdf_url && property.budget_pdf_url.trim().length > 0;

      if (!hasBudget) {
        propertiesWithoutReport.push({
          id: property.id,
          address: property.address || 'Sin dirección',
          fullAddress: property.address || null,
          'Set Up Status': property['Set Up Status'] || null,
          reno_phase: property.reno_phase || null,
          renovator: property['Renovator name'] || null,
          created_at: property.created_at || null,
        });
      } else {
        propertiesWithReport.push(property.id);
      }
    }

    // 3. Generar informe
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 INFORME: Propiedades en Reno In Progress sin Presupuesto de Reforma');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 RESUMEN:`);
    console.log(`   Total propiedades en reno-in-progress: ${properties.length}`);
    console.log(`   ✅ Con presupuesto de reforma: ${propertiesWithReport.length}`);
    console.log(`   ❌ Sin presupuesto de reforma: ${propertiesWithoutReport.length}\n`);

    if (propertiesWithoutReport.length === 0) {
      console.log('✅ ¡Excelente! Todas las propiedades tienen presupuesto de reforma.\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`❌ PROPIEDADES SIN PRESUPUESTO DE REFORMA (${propertiesWithoutReport.length}):`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Agrupar por renovador
    const byRenovator: Record<string, PropertyWithoutReport[]> = {};
    const withoutRenovator: PropertyWithoutReport[] = [];

    propertiesWithoutReport.forEach(prop => {
      const renovator = prop.renovator || 'Sin renovador';
      if (renovator === 'Sin renovador') {
        withoutRenovator.push(prop);
      } else {
        if (!byRenovator[renovator]) {
          byRenovator[renovator] = [];
        }
        byRenovator[renovator].push(prop);
      }
    });

    // Mostrar por renovador
    const renovators = Object.keys(byRenovator).sort();
    renovators.forEach(renovator => {
      const props = byRenovator[renovator];
      console.log(`\n👷 ${renovator} (${props.length} propiedades):`);
      props.forEach((prop, index) => {
        const address = prop.fullAddress || prop.address;
        console.log(`   ${index + 1}. ${prop.id} - ${address}`);
        if (prop['Set Up Status']) {
          console.log(`      Estado: ${prop['Set Up Status']}`);
        }
      });
    });

    // Mostrar sin renovador
    if (withoutRenovator.length > 0) {
      console.log(`\n❓ Sin renovador asignado (${withoutRenovator.length} propiedades):`);
      withoutRenovator.forEach((prop, index) => {
        const address = prop.fullAddress || prop.address;
        console.log(`   ${index + 1}. ${prop.id} - ${address}`);
        if (prop['Set Up Status']) {
          console.log(`      Estado: ${prop['Set Up Status']}`);
        }
      });
    }

    // Tabla resumen
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLA RESUMEN:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('ID\t\t\t\tDirección\t\t\t\tRenovador');
    console.log('─'.repeat(100));
    
    propertiesWithoutReport.forEach(prop => {
      const address = (prop.fullAddress || prop.address || 'Sin dirección').substring(0, 30).padEnd(30);
      const renovator = (prop.renovator || 'Sin renovador').substring(0, 20).padEnd(20);
      console.log(`${prop.id}\t${address}\t${renovator}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Informe completado\n');

    // 4. Generar archivo CSV
    if (propertiesWithoutReport.length > 0) {
      const reportsDir = path.join(projectDir, 'reports');
      
      // Crear directorio si no existe
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generar nombre de archivo con fecha
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const csvFileName = `properties-without-report-${dateStr}.csv`;
      const csvFilePath = path.join(reportsDir, csvFileName);

      // Crear contenido CSV
      const csvHeaders = [
        'ID',
        'Dirección',
        'Renovador',
        'Estado',
        'Fecha Creación',
        'Presupuesto PDF URL'
      ];

      const csvRows = propertiesWithoutReport.map(prop => {
        // Obtener la propiedad completa para incluir budget_pdf_url si existe
        const fullProperty = properties.find(p => p.id === prop.id);
        return [
          prop.id,
          `"${(prop.fullAddress || prop.address || 'Sin dirección').replace(/"/g, '""')}"`,
          prop.renovator || 'Sin renovador',
          prop['Set Up Status'] || 'N/A',
          prop.created_at ? new Date(prop.created_at).toISOString().split('T')[0] : 'N/A',
          fullProperty?.budget_pdf_url || 'No tiene'
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Escribir archivo CSV
      fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

      console.log('📄 Archivo CSV generado:');
      console.log(`   ${csvFilePath}\n`);

      // También generar un archivo de texto simple con el listado
      const txtFileName = `properties-without-report-${dateStr}.txt`;
      const txtFilePath = path.join(reportsDir, txtFileName);

      const txtContent = [
        '═══════════════════════════════════════════════════════════════',
        '📋 INFORME: Propiedades en Reno In Progress sin Presupuesto de Reforma',
        `Fecha: ${dateStr}`,
        '═══════════════════════════════════════════════════════════════',
        '',
        `📊 RESUMEN:`,
        `   Total propiedades en reno-in-progress: ${properties.length}`,
        `   ✅ Con presupuesto de reforma: ${propertiesWithReport.length}`,
        `   ❌ Sin presupuesto de reforma: ${propertiesWithoutReport.length}`,
        '',
        '═══════════════════════════════════════════════════════════════',
        `❌ PROPIEDADES SIN PRESUPUESTO DE REFORMA (${propertiesWithoutReport.length}):`,
        '═══════════════════════════════════════════════════════════════',
        '',
        ...renovators.map(renovator => {
          const props = byRenovator[renovator];
          return [
            `👷 ${renovator} (${props.length} propiedades):`,
            ...props.map((prop, index) => {
              const address = prop.fullAddress || prop.address;
              const status = prop['Set Up Status'] ? `      Estado: ${prop['Set Up Status']}` : '';
              return `   ${index + 1}. ${prop.id} - ${address}${status ? '\n' + status : ''}`;
            })
          ].join('\n');
        }),
        ...(withoutRenovator.length > 0 ? [
          '',
          `❓ Sin renovador asignado (${withoutRenovator.length} propiedades):`,
          ...withoutRenovator.map((prop, index) => {
            const address = prop.fullAddress || prop.address;
            const status = prop['Set Up Status'] ? `      Estado: ${prop['Set Up Status']}` : '';
            return `   ${index + 1}. ${prop.id} - ${address}${status ? '\n' + status : ''}`;
          })
        ] : []),
        '',
        '═══════════════════════════════════════════════════════════════',
        '📊 LISTADO COMPLETO:',
        '═══════════════════════════════════════════════════════════════',
        '',
        ...propertiesWithoutReport.map((prop, index) => {
          const address = prop.fullAddress || prop.address || 'Sin dirección';
          const renovator = prop.renovator || 'Sin renovador';
          const status = prop['Set Up Status'] || 'N/A';
          return `${index + 1}. ${prop.id} | ${address} | ${renovator} | ${status}`;
        })
      ].join('\n');

      fs.writeFileSync(txtFilePath, txtContent, 'utf-8');

      console.log('📄 Archivo de texto generado:');
      console.log(`   ${txtFilePath}\n`);
    }

  } catch (error) {
    console.error('❌ Error generando informe:', error);
  }
}

// Ejecutar
checkPropertiesWithoutReport()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
