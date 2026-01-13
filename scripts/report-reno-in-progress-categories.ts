#!/usr/bin/env tsx
/**
 * Script para generar informe de propiedades en "reno-in-progress"
 * Muestra cuántas tienen categorías extraídas correctamente del PDF y cuántas han fallado
 * 
 * Uso: npx tsx scripts/report-reno-in-progress-categories.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';

interface PropertyReport {
  id: string;
  address: string;
  budget_pdf_url: string | null;
  hasCategories: boolean;
  categoriesCount: number;
  categories: Array<{
    category_name: string;
    percentage: number | null;
  }>;
  status: 'success' | 'no_pdf' | 'no_categories' | 'failed';
}

async function generateReport() {
  console.log('📊 Generando informe de categorías para propiedades en "reno-in-progress"\n');
  console.log('='.repeat(80));
  
  const supabase = createAdminClient();
  
  // 1. Obtener todas las propiedades en fase "reno-in-progress"
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, address, budget_pdf_url, reno_phase')
    .eq('reno_phase', 'reno-in-progress')
    .order('address');
  
  if (propertiesError) {
    console.error('❌ Error obteniendo propiedades:', propertiesError);
    process.exit(1);
  }
  
  if (!properties || properties.length === 0) {
    console.log('⚠️  No se encontraron propiedades en fase "reno-in-progress"');
    process.exit(0);
  }
  
  console.log(`\n📋 Total propiedades en "reno-in-progress": ${properties.length}\n`);
  
  // 2. Para cada propiedad, verificar si tiene categorías
  const reports: PropertyReport[] = [];
  
  for (const property of properties) {
    // Obtener categorías de la propiedad
    const { data: categories, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('category_name, percentage')
      .eq('property_id', property.id)
      .order('category_name');
    
    if (categoriesError) {
      console.error(`❌ Error obteniendo categorías para ${property.id}:`, categoriesError);
      continue;
    }
    
    const hasCategories = categories && categories.length > 0;
    const categoriesCount = categories?.length || 0;
    
    // Determinar el estado
    let status: PropertyReport['status'];
    if (!property.budget_pdf_url) {
      status = 'no_pdf';
    } else if (!hasCategories) {
      status = 'no_categories';
    } else {
      status = 'success';
    }
    
    reports.push({
      id: property.id,
      address: property.address || property.id,
      budget_pdf_url: property.budget_pdf_url,
      hasCategories,
      categoriesCount,
      categories: categories?.map(c => ({
        category_name: c.category_name,
        percentage: c.percentage,
      })) || [],
      status,
    });
  }
  
  // 3. Generar estadísticas
  const withPdf = reports.filter(r => r.budget_pdf_url !== null && r.budget_pdf_url !== '');
  const withoutPdf = reports.filter(r => !r.budget_pdf_url || r.budget_pdf_url === '');
  const withCategories = reports.filter(r => r.hasCategories);
  const withoutCategories = reports.filter(r => r.budget_pdf_url && !r.hasCategories);
  const success = reports.filter(r => r.status === 'success');
  const failed = reports.filter(r => r.status === 'no_categories');
  
  console.log('\n📊 ESTADÍSTICAS GENERALES:\n');
  console.log(`   Total propiedades: ${reports.length}`);
  console.log(`   ✅ Con categorías extraídas correctamente: ${success.length} (${((success.length / reports.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Con PDF pero sin categorías (falló extracción): ${failed.length} (${((failed.length / reports.length) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Sin PDF del presupuesto: ${withoutPdf.length} (${((withoutPdf.length / reports.length) * 100).toFixed(1)}%)`);
  console.log(`   📄 Con PDF: ${withPdf.length}`);
  console.log(`   📋 Con categorías: ${withCategories.length}`);
  
  // 4. Estadísticas de categorías
  if (withCategories.length > 0) {
    const totalCategories = withCategories.reduce((sum, r) => sum + r.categoriesCount, 0);
    const avgCategories = totalCategories / withCategories.length;
    const maxCategories = Math.max(...withCategories.map(r => r.categoriesCount));
    const minCategories = Math.min(...withCategories.map(r => r.categoriesCount));
    
    console.log(`\n📊 ESTADÍSTICAS DE CATEGORÍAS:\n`);
    console.log(`   Total categorías extraídas: ${totalCategories}`);
    console.log(`   Promedio de categorías por propiedad: ${avgCategories.toFixed(1)}`);
    console.log(`   Máximo de categorías: ${maxCategories}`);
    console.log(`   Mínimo de categorías: ${minCategories}`);
  }
  
  // 5. Lista detallada de propiedades sin categorías (pero con PDF)
  if (failed.length > 0) {
    console.log(`\n❌ PROPIEDADES CON PDF PERO SIN CATEGORÍAS (${failed.length}):\n`);
    failed.slice(0, 20).forEach((report, idx) => {
      console.log(`   ${idx + 1}. ${report.address} (${report.id})`);
      console.log(`      PDF: ${report.budget_pdf_url?.substring(0, 80)}${report.budget_pdf_url && report.budget_pdf_url.length > 80 ? '...' : ''}`);
    });
    if (failed.length > 20) {
      console.log(`   ... y ${failed.length - 20} más`);
    }
  }
  
  // 6. Lista de propiedades sin PDF
  if (withoutPdf.length > 0) {
    console.log(`\n⚠️  PROPIEDADES SIN PDF DEL PRESUPUESTO (${withoutPdf.length}):\n`);
    withoutPdf.slice(0, 20).forEach((report, idx) => {
      console.log(`   ${idx + 1}. ${report.address} (${report.id})`);
    });
    if (withoutPdf.length > 20) {
      console.log(`   ... y ${withoutPdf.length - 20} más`);
    }
  }
  
  // 7. Ejemplos de propiedades con categorías exitosas
  if (success.length > 0) {
    console.log(`\n✅ EJEMPLOS DE PROPIEDADES CON CATEGORÍAS EXTRAÍDAS (primeras 5):\n`);
    success.slice(0, 5).forEach((report, idx) => {
      console.log(`   ${idx + 1}. ${report.address} (${report.id})`);
      console.log(`      Categorías: ${report.categoriesCount}`);
      if (report.categories.length > 0) {
        console.log(`      Primeras categorías:`);
        report.categories.slice(0, 3).forEach(cat => {
          console.log(`        - ${cat.category_name}${cat.percentage !== null ? ` (${cat.percentage}%)` : ''}`);
        });
        if (report.categories.length > 3) {
          console.log(`        ... y ${report.categories.length - 3} más`);
        }
      }
    });
  }
  
  // 8. Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN FINAL:\n');
  console.log(`   ✅ Éxito (con categorías): ${success.length} propiedades`);
  console.log(`   ❌ Falló (PDF sin categorías): ${failed.length} propiedades`);
  console.log(`   ⚠️  Sin PDF: ${withoutPdf.length} propiedades`);
  console.log(`\n   Tasa de éxito: ${((success.length / withPdf.length) * 100).toFixed(1)}% (de las que tienen PDF)`);
  console.log(`   Tasa de fallo: ${((failed.length / withPdf.length) * 100).toFixed(1)}% (de las que tienen PDF)`);
  
  console.log('\n✅ Informe completado\n');
}

generateReport()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
