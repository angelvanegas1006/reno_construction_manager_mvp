/**
 * Environment Configuration
 * 
 * Centralized configuration for different environments
 * (development, staging, production)
 */

export type Environment = 'development' | 'staging' | 'production';

/**
 * Get current environment
 */
export const getEnvironment = (): Environment => {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 
              process.env.NODE_ENV || 
              'development';
  
  if (env === 'production' || env === 'staging' || env === 'development') {
    return env;
  }
  
  // Default to development if not recognized
  return 'development';
};

/**
 * Environment checks
 */
export const isDevelopment = () => getEnvironment() === 'development';
export const isStaging = () => getEnvironment() === 'staging';
export const isProduction = () => getEnvironment() === 'production';

/**
 * Application Configuration
 */
export const config = {
  environment: getEnvironment(),
  isDevelopment: isDevelopment(),
  isStaging: isStaging(),
  isProduction: isProduction(),
  
  /**
   * Supabase Configuration
   */
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  /**
   * API Configuration
   */
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  /**
   * Feature Flags
   */
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
    eventBusLogging: process.env.NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING === 'true',
  },
  
  /**
   * App URLs
   */
  urls: {
    partner: process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3000/partner',
    reno: process.env.NEXT_PUBLIC_RENO_URL || 'http://localhost:3000/reno',
    superAdmin: process.env.NEXT_PUBLIC_SUPER_ADMIN_URL || 'http://localhost:3000/vistral-vision',
  },
};

/**
 * Validate required environment variables
 */
const validateConfig = () => {
  const errors: string[] = [];
  
  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!config.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  if (errors.length > 0) {
    const errorMessage = `Missing required environment variables:\n${errors.join('\n')}\n\nPlease check your .env file.`;
    
    if (isDevelopment()) {
      console.warn(`⚠️  ${errorMessage}`);
    } else {
      throw new Error(errorMessage);
    }
  }
};

// Validate on import (only in production/staging)
if (!isDevelopment()) {
  validateConfig();
} else {
  // In development, just warn
  validateConfig();
}

/**
 * Get Supabase project name based on environment
 */
export const getSupabaseProjectName = (): string => {
  switch (getEnvironment()) {
    case 'production':
      return 'vistral-prod';
    case 'staging':
      return 'vistral-staging';
    case 'development':
    default:
      return 'vistral-dev';
  }
};

/**
 * Log environment info (only in development)
 */
if (isDevelopment() && typeof window === 'undefined') {
  console.log('🔧 Environment Configuration:');
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Supabase Project: ${getSupabaseProjectName()}`);
  console.log(`   Supabase URL: ${config.supabase.url ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Debug Mode: ${config.features.debug ? '✅ Enabled' : '❌ Disabled'}`);
}

