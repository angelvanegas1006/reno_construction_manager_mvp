#!/usr/bin/env tsx
/**
 * Script to check if environment variables are properly configured
 */

import { config } from '../lib/config/environment';

console.log('🔍 Checking environment configuration...\n');

console.log('Environment:', config.environment);
console.log('Is Development:', config.isDevelopment);
console.log('Is Staging:', config.isStaging);
console.log('Is Production:', config.isProduction);
console.log('');

console.log('📋 Supabase Configuration:');
console.log('  URL:', config.supabase.url ? `✅ ${config.supabase.url.substring(0, 30)}...` : '❌ Missing');
console.log('  Anon Key:', config.supabase.anonKey ? `✅ ${config.supabase.anonKey.substring(0, 20)}...` : '❌ Missing');
console.log('  Service Role Key:', config.supabase.serviceRoleKey ? '✅ Set' : '⚠️  Not set (optional)');
console.log('');

if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('❌ ERROR: Missing required Supabase environment variables!');
  console.error('');
  console.error('Please set the following in your .env.local file:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.error('');
  process.exit(1);
}

if (config.supabase.url.trim() === '' || config.supabase.anonKey.trim() === '') {
  console.error('❌ ERROR: Supabase environment variables are empty!');
  console.error('');
  console.error('Please check your .env.local file and ensure the values are not empty.');
  console.error('');
  process.exit(1);
}

console.log('✅ All required environment variables are configured correctly!');
console.log('');

// Validate URL format
try {
  const url = new URL(config.supabase.url);
  if (!url.hostname.includes('supabase')) {
    console.warn('⚠️  Warning: Supabase URL does not contain "supabase" in hostname');
  }
} catch (e) {
  console.error('❌ ERROR: Invalid Supabase URL format!');
  console.error('  URL:', config.supabase.url);
  process.exit(1);
}

console.log('✅ Supabase URL format is valid');
console.log('');


