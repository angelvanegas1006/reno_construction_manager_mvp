# Configuración de Entornos (Dev, Staging, Production)

## 📋 Estrategia de Entornos

### **3 Entornos Propuestos**

1. **Development (Dev)** - Desarrollo local
2. **Staging** - Pruebas antes de producción
3. **Production** - Entorno de producción

---

## 🏗️ Arquitectura de Entornos

### **Opción 1: Proyectos Supabase Separados (Recomendado)**

```
┌─────────────────────────────────────────┐
│         Development                    │
│  - Local (localhost:3000)              │
│  - Supabase Project: vistral-dev       │
│  - Database: vistral_dev               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Staging                         │
│  - URL: staging.vistral.com           │
│  - Supabase Project: vistral-staging    │
│  - Database: vistral_staging           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Production                      │
│  - URL: vistral.com                    │
│  - Supabase Project: vistral-prod       │
│  - Database: vistral_prod              │
└─────────────────────────────────────────┘
```

**Ventajas**:
- ✅ Separación completa de datos
- ✅ Puedes resetear staging sin afectar producción
- ✅ Testing seguro en staging
- ✅ Rollback fácil

---

## 📁 Estructura de Archivos de Entorno

### **1. Variables de Entorno por Entorno**

```
vistral-mvp/
├── .env.local              # Development (gitignored)
├── .env.staging            # Staging (gitignored)
├── .env.production        # Production (gitignored)
├── .env.example           # Template (committed)
└── .gitignore             # Ignora .env.local, .env.staging, .env.production
```

### **2. Archivo `.env.example` (Template)**

```env
# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# Environment
# ============================================
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# ============================================
# API URLs (if needed)
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3001

# ============================================
# Feature Flags
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### **3. `.env.local` (Development)**

```env
# Development Environment
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# Supabase Development Project
NEXT_PUBLIC_SUPABASE_URL=https://vistral-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=dev-service-role-key-here

# Local API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### **4. `.env.staging` (Staging)**

```env
# Staging Environment
NEXT_PUBLIC_APP_ENV=staging
NODE_ENV=production

# Supabase Staging Project
NEXT_PUBLIC_SUPABASE_URL=https://vistral-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key-here

# Staging API
NEXT_PUBLIC_API_URL=https://api-staging.vistral.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### **5. `.env.production` (Production)**

```env
# Production Environment
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production

# Supabase Production Project
NEXT_PUBLIC_SUPABASE_URL=https://vistral-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key-here

# Production API
NEXT_PUBLIC_API_URL=https://api.vistral.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

---

## 🔧 Configuración en Next.js

### **1. `next.config.ts` - Configuración por Entorno**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  },
  
  // Solo en desarrollo
  ...(process.env.NEXT_PUBLIC_APP_ENV === 'development' && {
    reactStrictMode: true,
  }),
};

export default nextConfig;
```

### **2. `lib/config/environment.ts` - Helper para Entornos**

```typescript
/**
 * Environment Configuration
 */

export type Environment = 'development' | 'staging' | 'production';

export const getEnvironment = (): Environment => {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  if (env === 'production' || env === 'staging' || env === 'development') {
    return env;
  }
  
  return 'development';
};

export const isDevelopment = () => getEnvironment() === 'development';
export const isStaging = () => getEnvironment() === 'staging';
export const isProduction = () => getEnvironment() === 'production';

export const config = {
  environment: getEnvironment(),
  isDevelopment: isDevelopment(),
  isStaging: isStaging(),
  isProduction: isProduction(),
  
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  api: {
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    debug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  },
};

// Validar que las variables requeridas estén presentes
if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please check your .env file.'
  );
}
```

### **3. Actualizar `lib/supabase/client.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from '@/lib/config/environment';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': `vistral-${config.environment}`,
    },
  },
});
```

---

## 🗄️ Setup de Supabase por Entorno

### **Paso 1: Crear Proyectos en Supabase**

1. **Development Project**
   - Nombre: `vistral-dev`
   - Region: Más cercana a tu ubicación
   - Plan: Free tier está bien para dev

2. **Staging Project**
   - Nombre: `vistral-staging`
   - Region: Misma que production
   - Plan: Free tier o Pro (según necesidades)

3. **Production Project**
   - Nombre: `vistral-prod`
   - Region: Más cercana a tus usuarios
   - Plan: Pro (para producción)

### **Paso 2: Ejecutar Migraciones en Cada Entorno**

```bash
# Development
supabase link --project-ref vistral-dev-ref
supabase db push

# Staging
supabase link --project-ref vistral-staging-ref
supabase db push

# Production
supabase link --project-ref vistral-prod-ref
supabase db push
```

**O manualmente**:
1. Ve a cada proyecto en Supabase Dashboard
2. SQL Editor → Ejecuta las migraciones

### **Paso 3: Configurar Variables de Entorno**

Copia las keys de cada proyecto:
- Settings → API → Project URL y anon key
- Settings → API → service_role key (solo backend)

---

## 🚀 Configuración en Vercel (Deployment)

### **1. Crear Proyectos en Vercel**

```
- vistral-partner-staging
- vistral-partner-prod
- vistral-reno-staging
- vistral-reno-prod
- vistral-super-admin-staging
- vistral-super-admin-prod
```

### **2. Configurar Variables de Entorno en Vercel**

Para cada proyecto:

**Staging Projects**:
```
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://vistral-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key
```

**Production Projects**:
```
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://vistral-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
```

### **3. Configurar Branches**

**Staging**:
- Branch: `staging`
- Auto-deploy: ✅ Enabled

**Production**:
- Branch: `main`
- Auto-deploy: ✅ Enabled (o manual)

---

## 📝 Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:staging": "next dev --env-file=.env.staging",
    "build": "next build",
    "build:staging": "next build --env-file=.env.staging",
    "build:prod": "next build --env-file=.env.production",
    "start": "next start",
    "start:staging": "next start --env-file=.env.staging",
    
    "env:dev": "cp .env.example .env.local",
    "env:staging": "cp .env.example .env.staging",
    "env:prod": "cp .env.example .env.production",
    
    "supabase:dev": "supabase link --project-ref dev-ref",
    "supabase:staging": "supabase link --project-ref staging-ref",
    "supabase:prod": "supabase link --project-ref prod-ref"
  }
}
```

---

## 🔐 Seguridad

### **1. `.gitignore`**

```gitignore
# Environment files
.env.local
.env.staging
.env.production
.env*.local

# Pero sí commitear
.env.example
```

### **2. Secrets Management**

**Nunca commitees**:
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend)
- API keys privadas
- Tokens de autenticación

**Sí puedes commitear**:
- `NEXT_PUBLIC_*` variables (son públicas de todas formas)
- `.env.example` (sin valores reales)

### **3. Vercel Secrets**

Usa Vercel Secrets para variables sensibles:
- Settings → Environment Variables
- Marca como "Sensitive" las que no deben exponerse

---

## 🧪 Testing en Diferentes Entornos

### **Local Development**

```bash
# Usa .env.local automáticamente
npm run dev
```

### **Staging**

```bash
# Build con staging env
npm run build:staging

# O en Vercel, deploy desde branch 'staging'
```

### **Production**

```bash
# Build con production env
npm run build:prod

# O en Vercel, deploy desde branch 'main'
```

---

## 📊 Comparación de Entornos

| Aspecto | Development | Staging | Production |
|---------|------------|---------|------------|
| **URL** | localhost:3000 | staging.vistral.com | vistral.com |
| **Supabase** | vistral-dev | vistral-staging | vistral-prod |
| **Database** | Datos de prueba | Datos de prueba | Datos reales |
| **Debug** | ✅ Enabled | ✅ Enabled | ❌ Disabled |
| **Analytics** | ❌ Disabled | ✅ Enabled | ✅ Enabled |
| **Auto-deploy** | Manual | ✅ Auto (staging branch) | ✅ Auto (main branch) |
| **Reset DB** | ✅ Frecuente | ✅ Ocasional | ❌ Nunca |

---

## ✅ Checklist de Setup

### **Development**
- [ ] Crear proyecto Supabase `vistral-dev`
- [ ] Crear `.env.local` desde `.env.example`
- [ ] Configurar variables en `.env.local`
- [ ] Ejecutar migraciones en dev
- [ ] Verificar que `npm run dev` funciona

### **Staging**
- [ ] Crear proyecto Supabase `vistral-staging`
- [ ] Crear `.env.staging` desde `.env.example`
- [ ] Configurar variables en `.env.staging`
- [ ] Ejecutar migraciones en staging
- [ ] Crear proyectos en Vercel para staging
- [ ] Configurar variables en Vercel
- [ ] Crear branch `staging` en Git
- [ ] Configurar auto-deploy desde `staging` branch

### **Production**
- [ ] Crear proyecto Supabase `vistral-prod`
- [ ] Crear `.env.production` desde `.env.example`
- [ ] Configurar variables en `.env.production`
- [ ] Ejecutar migraciones en production
- [ ] Crear proyectos en Vercel para production
- [ ] Configurar variables en Vercel
- [ ] Configurar dominio personalizado
- [ ] Configurar SSL/HTTPS
- [ ] Setup monitoring y alerting

---

## 🎯 Próximos Pasos

1. **Crear proyectos Supabase** (dev, staging, prod)
2. **Configurar archivos `.env`** para cada entorno
3. **Crear helper `lib/config/environment.ts`**
4. **Actualizar código para usar config**
5. **Setup Vercel** con variables de entorno
6. **Ejecutar migraciones** en cada entorno

---

¿Quieres que cree los archivos de configuración ahora o prefieres hacerlo paso a paso?

