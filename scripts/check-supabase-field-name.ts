import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });
import { createAdminClient } from '../lib/supabase/admin';

async function checkFieldName() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  const keys = Object.keys(data || {});
  const estRenoKeys = keys.filter(k => 
    k.toLowerCase().includes('est') && 
    k.toLowerCase().includes('reno') && 
    k.toLowerCase().includes('start')
  );
  
  console.log('Campos relacionados con Est_reno_start_date:');
  estRenoKeys.forEach(k => console.log('  -', k));
  
  console.log('\nTodos los campos que contienen "start":');
  keys.filter(k => k.toLowerCase().includes('start')).forEach(k => console.log('  -', k));
  
  console.log('\nTodos los campos que contienen "reno":');
  keys.filter(k => k.toLowerCase().includes('reno')).forEach(k => console.log('  -', k));
}

checkFieldName().catch(console.error);

