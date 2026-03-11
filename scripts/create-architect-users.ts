/**
 * Script para crear cuentas de arquitectos desde Airtable B2B Partners
 *
 * Ejecutar con:
 *   npx tsx scripts/create-architect-users.ts          # solo listar (dry-run)
 *   npx tsx scripts/create-architect-users.ts --create  # listar + crear cuentas
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// 1. Cargar .env.local
// ---------------------------------------------------------------------------
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch {
  console.warn('⚠️  No se pudo cargar .env.local, usando variables de entorno del sistema');
}

import Airtable from 'airtable';
import { getAuth0ManagementClient } from '@/lib/auth0/management-client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const B2B_TABLE_ID = 'tbljB4pROJtXPOdpt';
const ARCHITECTS_VIEW_ID = 'viwKXdfkQyApxpAmG';
const TEMP_PASSWORD = 'PropHero2026';
const ROLE: Database['public']['Enums']['app_role'] = 'architect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function syncRoleToSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  role: Database['public']['Enums']['app_role'],
): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .upsert(
      { user_id: userId, role, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

interface ArchitectRecord {
  airtableId: string;
  name: string;
  email: string | null;
  company: string | null;
}

// ---------------------------------------------------------------------------
// Fetch architects from Airtable
// ---------------------------------------------------------------------------
async function fetchArchitectsFromAirtable(): Promise<ArchitectRecord[]> {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Faltan las credenciales de Airtable (NEXT_PUBLIC_AIRTABLE_API_KEY / NEXT_PUBLIC_AIRTABLE_BASE_ID)');
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const records = await base(B2B_TABLE_ID)
    .select({ view: ARCHITECTS_VIEW_ID })
    .all();

  return records.map(rec => {
    const f = rec.fields;
    return {
      airtableId: rec.id,
      name: (f['Name'] as string) ?? '',
      email: ((f['Email'] as string) ?? '').trim() || null,
      company: ((f['Company'] as string) ?? '').trim() || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const shouldCreate = process.argv.includes('--create');

  console.log('='.repeat(60));
  console.log('  Arquitectos desde Airtable (B2B Partners)');
  console.log('='.repeat(60));

  // --- Fetch from Airtable ---
  const architects = await fetchArchitectsFromAirtable();

  console.log(`\nTotal arquitectos encontrados: ${architects.length}\n`);

  const withEmail = architects.filter(a => a.email);
  const withoutEmail = architects.filter(a => !a.email);

  console.log('--- CON email (se les podrá crear cuenta) ---');
  withEmail.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.name.padEnd(30)} | ${a.email!.padEnd(35)} | ${a.company ?? '-'}`);
  });

  if (withoutEmail.length > 0) {
    console.log('\n--- SIN email (no se les creará cuenta) ---');
    withoutEmail.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name.padEnd(30)} | (sin email)  | ${a.company ?? '-'}`);
    });
  }

  console.log(`\nResumen: ${withEmail.length} con email, ${withoutEmail.length} sin email.`);

  if (!shouldCreate) {
    console.log('\nModo listado. Para crear las cuentas ejecuta:');
    console.log('  npx tsx scripts/create-architect-users.ts --create\n');
    return;
  }

  // --- Verify env vars ---
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('\n❌ Faltan variables de entorno de Supabase:', missing.join(', '));
    process.exit(1);
  }

  const auth0Vars = ['AUTH0_DOMAIN', 'AUTH0_MANAGEMENT_CLIENT_ID', 'AUTH0_MANAGEMENT_CLIENT_SECRET'];
  const missingAuth0 = auth0Vars.filter(v => !process.env[v]);
  const useAuth0 = missingAuth0.length === 0;

  if (!useAuth0) {
    console.warn('\n⚠️  Auth0 no configurado. Solo se crearán usuarios en Supabase.');
  }

  const auth0Client = useAuth0 ? getAuth0ManagementClient() : null;
  const supabase = createAdminClient();

  if (useAuth0 && auth0Client) {
    console.log('\n📋 Sincronizando roles en Auth0...');
    try {
      await auth0Client.syncRolesFromSupabase();
      console.log('✅ Roles sincronizados');
    } catch (e: any) {
      console.error('❌ Error sincronizando roles:', e.message);
    }
  }

  // Pre-fetch existing Supabase users once
  const { data: supabaseUsersData } = await supabase.auth.admin.listUsers();
  const existingEmails = new Set(
    (supabaseUsersData?.users ?? []).map(u => u.email?.toLowerCase()),
  );

  console.log(`\n🏗️  Creando cuentas de arquitectos (password: ${TEMP_PASSWORD})...\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const arch of withEmail) {
    const email = arch.email!;
    try {
      // Check Supabase
      if (existingEmails.has(email.toLowerCase())) {
        console.log(`⏭️  ${email} — ya existe en Supabase, saltando.`);
        skipped++;
        continue;
      }

      // Auth0
      if (useAuth0 && auth0Client) {
        const existing = await auth0Client.getUserByEmail(email);
        if (existing) {
          await auth0Client.assignRoleToUser(existing.user_id, ROLE);
          console.log(`   Auth0: rol actualizado para ${email}`);
        } else {
          await auth0Client.createUser({
            email,
            password: TEMP_PASSWORD,
            name: arch.name,
            role: ROLE,
          });
          console.log(`   Auth0: usuario creado ${email}`);
        }
      }

      // Supabase
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { name: arch.name },
      });

      if (error) throw error;
      if (!newUser.user) throw new Error('No se pudo crear el usuario en Supabase');

      await syncRoleToSupabase(supabase, newUser.user.id, ROLE);

      console.log(`✅ ${arch.name} (${email}) — cuenta creada`);
      created++;
    } catch (err: any) {
      console.error(`❌ ${arch.name} (${email}) — ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Resultado: ${created} creados | ${skipped} saltados | ${failed} fallidos`);
  console.log('='.repeat(60));
  console.log(`\n📝 Password temporal: ${TEMP_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
  });
