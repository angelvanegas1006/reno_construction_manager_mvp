import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPdfText } from '@/lib/pdf/extract-pdf-text';
import { extractActivitiesFromPdf } from '@/lib/pdf/extract-activities-from-pdf';

/**
 * API Route para extraer actividades de categorías desde el PDF
 * Solo se usa como solución de respaldo cuando n8n no extrajo las actividades
 * 
 * POST /api/extract-pdf-activities
 * Body: { propertyId: string, budgetIndex?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, budgetIndex } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    console.log(`[Extract PDF Activities] Starting extraction for property ${propertyId}, budgetIndex: ${budgetIndex || 'all'}`);

    // 1. Obtener la propiedad para obtener budget_pdf_url
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, budget_pdf_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Extract PDF Activities] Property not found:', propertyError);
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    if (!property.budget_pdf_url) {
      return NextResponse.json(
        { error: 'Property does not have budget_pdf_url' },
        { status: 400 }
      );
    }

    // 2. Separar múltiples URLs y seleccionar la correcta
    const urls = property.budget_pdf_url
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No valid PDF URLs found' },
        { status: 400 }
      );
    }

    // Si se especifica budgetIndex, usar solo ese PDF
    // Si no, procesar todos los PDFs (aunque normalmente debería especificarse)
    const pdfUrlsToProcess = budgetIndex !== undefined
      ? [urls[budgetIndex - 1]].filter(Boolean) // 1-based index
      : urls;

    if (pdfUrlsToProcess.length === 0) {
      return NextResponse.json(
        { error: `Invalid budgetIndex: ${budgetIndex}. Available indexes: 1-${urls.length}` },
        { status: 400 }
      );
    }

    const results: Array<{ budgetIndex: number; updated: number; errors: string[] }> = [];

    // 3. Procesar cada PDF
    for (let i = 0; i < pdfUrlsToProcess.length; i++) {
      const pdfUrl = pdfUrlsToProcess[i];
      const currentBudgetIndex = budgetIndex !== undefined ? budgetIndex : i + 1;

      console.log(`[Extract PDF Activities] Processing PDF ${currentBudgetIndex}: ${pdfUrl.substring(0, 50)}...`);

      try {
        // 3.1 Obtener categorías sin actividades para este budget_index
        const { data: allCategories, error: categoriesError } = await supabase
          .from('property_dynamic_categories')
          .select('id, category_name, activities_text, budget_index')
          .eq('property_id', propertyId)
          .eq('budget_index', currentBudgetIndex);

        if (categoriesError) {
          console.error('[Extract PDF Activities] Error fetching categories:', categoriesError);
          results.push({
            budgetIndex: currentBudgetIndex,
            updated: 0,
            errors: [`Error fetching categories: ${categoriesError.message}`],
          });
          continue;
        }

        // Filtrar categorías sin actividades Y que correspondan al budget_index actual
        const categories = (allCategories || []).filter(
          cat => 
            (!cat.activities_text || cat.activities_text.trim().length === 0) &&
            cat.budget_index === currentBudgetIndex
        );

        if (!categories || categories.length === 0) {
          console.log(`[Extract PDF Activities] No categories without activities found for budgetIndex ${currentBudgetIndex}`);
          results.push({
            budgetIndex: currentBudgetIndex,
            updated: 0,
            errors: [`No categories found without activities for budget_index ${currentBudgetIndex}`],
          });
          continue;
        }

        console.log(`[Extract PDF Activities] Found ${categories.length} categories without activities for budgetIndex ${currentBudgetIndex}`);
        console.log(`[Extract PDF Activities] Categories to process:`, categories.map(c => c.category_name));

        // 3.2 Descargar el PDF
        const awsUsername = process.env.AWS_S3_USERNAME;
        const awsPassword = process.env.AWS_S3_PASSWORD;

        if (!awsUsername || !awsPassword) {
          return NextResponse.json(
            { error: 'AWS S3 credentials not configured' },
            { status: 500 }
          );
        }

        const credentials = Buffer.from(`${awsUsername}:${awsPassword}`).toString('base64');
        const pdfResponse = await fetch(pdfUrl, {
          headers: {
            'Authorization': `Basic ${credentials}`,
          },
        });

        if (!pdfResponse.ok) {
          const errorText = await pdfResponse.text().catch(() => 'Unable to read error response');
          console.error(`[Extract PDF Activities] Error fetching PDF: ${pdfResponse.status} - ${errorText.substring(0, 200)}`);
          results.push({
            budgetIndex: currentBudgetIndex,
            updated: 0,
            errors: [`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`],
          });
          continue;
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        console.log(`[Extract PDF Activities] PDF downloaded. Size: ${pdfBuffer.byteLength} bytes`);

        // 3.3 Extraer texto completo del PDF
        let fullText: string;
        try {
          fullText = await extractPdfText(pdfBuffer);
          console.log(`[Extract PDF Activities] PDF text extracted. Length: ${fullText.length} characters`);
          
        // Log un preview del texto para debugging (primeros 1000 caracteres)
        console.log(`[Extract PDF Activities] PDF text preview (first 1000 chars):`, fullText.substring(0, 1000));
        console.log(`[Extract PDF Activities] PDF text length: ${fullText.length} characters`);
        console.log(`[Extract PDF Activities] Categories to search for:`, categories.map(c => c.category_name));
        
        // Buscar todas las categorías mencionadas en el texto para debugging
        const foundCategoriesInText: string[] = [];
        categories.forEach(cat => {
          const searchTerms = [
            cat.category_name.toUpperCase(),
            cat.category_name.replace(/^\d+\s*/, '').toUpperCase(),
            cat.category_name.replace(/^\d+\.\s*/, '').toUpperCase(),
            cat.category_name.replace(/^\d+[.—\-]\s*/, '').toUpperCase(),
          ];
          
          for (const term of searchTerms) {
            if (fullText.toUpperCase().includes(term) && term.length > 3) {
              foundCategoriesInText.push(`${cat.category_name} (found as: "${term}")`);
              break;
            }
          }
        });
        console.log(`[Extract PDF Activities] Categories found in PDF text:`, foundCategoriesInText);
        } catch (extractError: any) {
          console.error(`[Extract PDF Activities] Error extracting text from PDF:`, extractError);
          results.push({
            budgetIndex: currentBudgetIndex,
            updated: 0,
            errors: [`Error extracting text from PDF: ${extractError.message || 'Unknown error'}`],
          });
          continue;
        }

        // 3.4 Verificar qué categorías realmente existen en este PDF antes de procesarlas
        // Esto evita intentar extraer actividades de categorías que no están en este PDF específico
        const categoriesInPdf: typeof categories = [];
        const categoriesNotInPdf: typeof categories = [];
        
        for (const category of categories) {
          // Verificar si la categoría existe en el texto del PDF usando múltiples variaciones
          const searchTerms = [
            category.category_name.toUpperCase(),
            category.category_name.replace(/^\d+\s*/, '').toUpperCase(),
            category.category_name.replace(/^\d+\.\s*/, '').toUpperCase(),
            category.category_name.replace(/^\d+[.—\-]\s*/, '').toUpperCase(),
          ];
          
          const foundInPdf = searchTerms.some(term => 
            term.length > 3 && fullText.toUpperCase().includes(term)
          );
          
          if (foundInPdf) {
            categoriesInPdf.push(category);
          } else {
            categoriesNotInPdf.push(category);
            console.log(`[Extract PDF Activities] ⚠️ Category "${category.category_name}" not found in PDF ${currentBudgetIndex}, skipping`);
          }
        }
        
        console.log(`[Extract PDF Activities] Categories in PDF ${currentBudgetIndex}: ${categoriesInPdf.length}`);
        console.log(`[Extract PDF Activities] Categories NOT in PDF ${currentBudgetIndex}: ${categoriesNotInPdf.length}`);
        if (categoriesNotInPdf.length > 0) {
          console.log(`[Extract PDF Activities] Skipped categories (not in PDF):`, categoriesNotInPdf.map(c => c.category_name));
        }

        // Si no hay categorías en este PDF, continuar sin error
        if (categoriesInPdf.length === 0) {
          console.log(`[Extract PDF Activities] No categories found in PDF ${currentBudgetIndex} (all categories were filtered out)`);
          results.push({
            budgetIndex: currentBudgetIndex,
            updated: 0,
            errors: [],
          });
          continue;
        }

        // 3.5 Obtener todos los nombres de categorías que SÍ están en el PDF para encontrar límites
        const allCategoryNames = categoriesInPdf.map(cat => cat.category_name);

        // 3.6 Extraer actividades solo para categorías que están en este PDF
        let updatedCount = 0;
        const errors: string[] = [];

        for (const category of categoriesInPdf) {
          try {
            console.log(`[Extract PDF Activities] 🔍 Processing category: "${category.category_name}" (budget_index: ${category.budget_index}, id: ${category.id})`);
            
            const activitiesText = extractActivitiesFromPdf(
              category.category_name,
              fullText,
              allCategoryNames
            );

            if (activitiesText && activitiesText.trim().length > 0) {
              console.log(`[Extract PDF Activities] ✅ Found activities for "${category.category_name}": ${activitiesText.length} characters`);
              console.log(`[Extract PDF Activities]   Preview: "${activitiesText.substring(0, 150)}..."`);
              
              const { error: updateError } = await supabase
                .from('property_dynamic_categories')
                .update({ activities_text: activitiesText })
                .eq('id', category.id);

              if (updateError) {
                console.error(`[Extract PDF Activities] ❌ Error updating category ${category.id}:`, updateError);
                errors.push(`Category "${category.category_name}": ${updateError.message}`);
              } else {
                updatedCount++;
                console.log(`[Extract PDF Activities] ✅ Successfully updated category "${category.category_name}"`);
              }
            } else {
              console.warn(`[Extract PDF Activities] ⚠️ No activities found for category "${category.category_name}" (category exists in PDF but no activities extracted)`);
              console.warn(`[Extract PDF Activities]   activitiesText was: ${activitiesText ? `"${activitiesText.substring(0, 100)}..."` : 'null'}`);
              errors.push(`Category "${category.category_name}": No activities found in PDF`);
            }
          } catch (categoryError: any) {
            console.error(`[Extract PDF Activities] Error processing category "${category.category_name}":`, categoryError);
            errors.push(`Category "${category.category_name}": ${categoryError.message || 'Unknown error'}`);
          }
        }

        results.push({
          budgetIndex: currentBudgetIndex,
          updated: updatedCount,
          errors,
        });

        console.log(`[Extract PDF Activities] ✅ Completed budgetIndex ${currentBudgetIndex}: ${updatedCount} categories updated`);
      } catch (pdfError: any) {
        console.error(`[Extract PDF Activities] ❌ Error processing PDF ${currentBudgetIndex}:`, pdfError);
        results.push({
          budgetIndex: currentBudgetIndex,
          updated: 0,
          errors: [pdfError.message || 'Unknown error processing PDF'],
        });
      }
    }

    // 4. Retornar resultados
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`[Extract PDF Activities] ✅ Completed. Total updated: ${totalUpdated}, Total errors: ${totalErrors}`);

    return NextResponse.json({
      success: true,
      propertyId,
      results,
      totalUpdated,
      totalErrors,
    });
  } catch (error: any) {
    console.error('[Extract PDF Activities] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
