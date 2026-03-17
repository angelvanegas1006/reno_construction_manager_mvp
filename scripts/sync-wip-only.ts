import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { syncWipProjectsFromAirtable } from '../lib/airtable/sync-projects';

async function main() {
  console.log('AIRTABLE_PROJECTS_TABLE_ID:', process.env.AIRTABLE_PROJECTS_TABLE_ID);
  console.log('Sync de proyectos WIP...');
  const result = await syncWipProjectsFromAirtable();
  console.log('Resultado:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
