import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

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

async function findByRecordId(recordId: string) {
  const base = getAirtableBase();
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Buscando record ID: ${recordId}\n`);
  
  try {
    const record = await base(AIRTABLE_TABLE_ID).find(recordId);
    
    console.log(`✅ ENCONTRADA en Airtable:`);
    console.log(`   Record ID: ${record.id}`);
    
    const uniqueId = 
      record.fields['UNIQUEID (from Engagements)'] ||
      record.fields['Unique ID (From Engagements)'] ||
      record.fields['Unique ID From Engagements'] ||
      record.fields['Unique ID'];
    const uniqueIdValue = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
    
    console.log(`   Unique ID: ${uniqueIdValue || 'N/A'}`);
    console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
    console.log(`   Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
    
    const budgetPdfUrl = record.fields['Budget PDF URL'] || 
                        record.fields['Budget PDF'] ||
                        record.fields['budget_pdf_url'] ||
                        null;
    console.log(`   Budget PDF URL: ${budgetPdfUrl || 'NULL'}`);
    
    // Verificar en Supabase
    if (uniqueIdValue) {
      const { data: supabaseProperty } = await supabase
        .from('properties')
        .select('id, reno_phase, "Set Up Status", budget_pdf_url')
        .eq('id', uniqueIdValue)
        .single();
      
      if (supabaseProperty) {
        console.log(`\n📊 Comparación con Supabase:`);
        console.log(`   budget_pdf_url en Airtable: ${budgetPdfUrl || 'NULL'}`);
        console.log(`   budget_pdf_url en Supabase: ${supabaseProperty.budget_pdf_url || 'NULL'}`);
        
        if (budgetPdfUrl && !supabaseProperty.budget_pdf_url) {
          console.log(`\n⚠️  Falta sincronizar budget_pdf_url desde Airtable`);
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

const recordId = process.argv[2] || 'rec1lrI7tJIkWPWKY';
findByRecordId(recordId).catch(console.error);
