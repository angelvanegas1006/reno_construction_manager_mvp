#!/usr/bin/env node

/**
 * Script para ejecutar migraciones SQL en Supabase
 * Usa el service_role key para ejecutar SQL directamente
 * 
 * Uso: node scripts/migrate-supabase.js [dev|staging|prod]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const ENVIRONMENT = process.argv[2] || 'dev';

// Cargar variables de entorno según el entorno
let envFile = '.env.local';
if (ENVIRONMENT === 'staging') {
  envFile = '.env.staging';
  require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });
} else if (ENVIRONMENT === 'prod') {
  envFile = '.env.production';
  require('dotenv').config({ path: path.resolve(__dirname, `../${envFile}`) });
} else {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✅' : '❌'}`);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`);
  console.error(`\n   Verifica que el archivo ${envFile} existe y tiene las credenciales correctas.`);
  process.exit(1);
}

const MIGRATION_FILE = path.resolve(__dirname, '../supabase/migrations/001_checklist_migrations.sql');

if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`❌ Error: Archivo de migración no encontrado: ${MIGRATION_FILE}`);
  process.exit(1);
}

async function runMigration() {
  console.log(`🚀 Ejecutando migraciones para: ${ENVIRONMENT}`);
  console.log(`📄 Archivo: ${MIGRATION_FILE}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`);

  // Crear cliente con service_role (tiene permisos de administrador)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Leer archivo SQL
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  // Dividir en statements (separados por ;)
  // Nota: Esto es una aproximación simple. Para SQL complejo, podría necesitar un parser más sofisticado
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Encontrados ${statements.length} statements SQL\n`);

  try {
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Saltar comentarios y bloques DO $$
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      console.log(`⏳ Ejecutando statement ${i + 1}/${statements.length}...`);

      // Usar rpc para ejecutar SQL directamente
      // Nota: Supabase no tiene un método directo para ejecutar SQL arbitrario desde el cliente
      // Necesitamos usar la API REST directamente o crear una función PostgreSQL
      
      // Alternativa: Usar fetch para llamar a la API REST de Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql: statement })
      });

      // Si la API no existe, intentar método alternativo
      if (!response.ok && response.status === 404) {
        console.log(`⚠️  Método directo no disponible. Usando método alternativo...`);
        
        // Para statements complejos, necesitamos ejecutarlos manualmente
        // La mejor opción es usar psql o el dashboard
        console.log(`\n❌ No se puede ejecutar SQL directamente desde el cliente de Supabase.`);
        console.log(`\n📋 Opciones:`);
        console.log(`\n1. Ejecutar manualmente en Supabase Dashboard:`);
        console.log(`   - Ve a: ${SUPABASE_URL.replace('/rest/v1', '')}`);
        console.log(`   - SQL Editor → New Query`);
        console.log(`   - Copia el contenido de: ${MIGRATION_FILE}`);
        console.log(`   - Click "Run"`);
        console.log(`\n2. Instalar Supabase CLI:`);
        console.log(`   npm install -g supabase`);
        console.log(`   supabase link --project-ref ${SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1]}`);
        console.log(`   supabase db push`);
        
        process.exit(1);
      }

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error en statement ${i + 1}:`, error);
        throw new Error(`Failed to execute statement ${i + 1}`);
      }
    }

    console.log(`\n✅ Migraciones ejecutadas exitosamente!`);
    console.log(`\n📋 Verifica en Supabase Dashboard que las tablas se crearon:`);
    console.log(`   - property_inspections`);
    console.log(`   - inspection_zones`);
    console.log(`   - inspection_elements`);
    console.log(`   - event_store`);

  } catch (error) {
    console.error(`\n❌ Error ejecutando migraciones:`, error.message);
    console.error(`\n💡 Sugerencia: Ejecuta las migraciones manualmente en Supabase Dashboard`);
    process.exit(1);
  }
}

runMigration();

