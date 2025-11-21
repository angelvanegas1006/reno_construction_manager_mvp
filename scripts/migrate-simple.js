#!/usr/bin/env node

/**
 * Script simple para mostrar el SQL y facilitar copiarlo
 * 
 * Uso: node scripts/migrate-simple.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = path.resolve(__dirname, '../supabase/migrations/001_checklist_migrations.sql');

if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`❌ Error: Archivo no encontrado: ${MIGRATION_FILE}`);
  process.exit(1);
}

const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

console.log('📄 Contenido del archivo de migraciones:\n');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('\n✅ Copia el contenido arriba y pégalo en Supabase Dashboard → SQL Editor');

