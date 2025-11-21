# Pasos Detallados de Migración

## Paso 1: Instalar Turborepo

```bash
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"
npm install -D turbo
```

## Paso 2: Crear Estructura de Carpetas

```bash
# Crear estructura de apps
mkdir -p apps/partner/app/partner
mkdir -p apps/partner/components/partner
mkdir -p apps/partner/lib/partner
mkdir -p apps/partner/public

mkdir -p apps/reno/app/reno
mkdir -p apps/reno/components/reno
mkdir -p apps/reno/lib/reno
mkdir -p apps/reno/public

mkdir -p apps/super-admin/app/vistral-vision
mkdir -p apps/super-admin/components/vistral-vision
mkdir -p apps/super-admin/lib/super-admin
mkdir -p apps/super-admin/public

# Crear estructura de packages compartidos
mkdir -p packages/shared-ui/components
mkdir -p packages/shared-lib/{auth,storage,checklist,property}
mkdir -p packages/shared-types
```

## Paso 3: Configurar Root package.json

```json
{
  "name": "vistral-mvp",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev:partner": "turbo run dev --filter=@vistral/partner",
    "dev:reno": "turbo run dev --filter=@vistral/reno",
    "dev:admin": "turbo run dev --filter=@vistral/super-admin"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

## Paso 4: Configurar turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Paso 5: Crear package.json para cada app

### apps/partner/package.json
```json
{
  "name": "@vistral/partner",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "@vistral/shared-ui": "workspace:*",
    "@vistral/shared-lib": "workspace:*",
    "@vistral/shared-types": "workspace:*",
    "next": "16.0.1",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  }
}
```

### apps/reno/package.json
```json
{
  "name": "@vistral/reno",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@vistral/shared-ui": "workspace:*",
    "@vistral/shared-lib": "workspace:*",
    "@vistral/shared-types": "workspace:*",
    "next": "16.0.1",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  }
}
```

### apps/super-admin/package.json
```json
{
  "name": "@vistral/super-admin",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint"
  },
  "dependencies": {
    "@vistral/shared-ui": "workspace:*",
    "@vistral/shared-lib": "workspace:*",
    "@vistral/shared-types": "workspace:*",
    "next": "16.0.1",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  }
}
```

## Paso 6: Migrar Código

### Mover rutas de Partner
```bash
# Mover rutas
mv app/partner/* apps/partner/app/partner/
mv components/partner/* apps/partner/components/partner/
mv lib/property-storage.ts apps/partner/lib/partner/
```

### Mover rutas de Reno
```bash
mv app/reno/* apps/reno/app/reno/
mv components/reno/* apps/reno/components/reno/
```

### Mover rutas de Super Admin
```bash
mv app/vistral-vision/* apps/super-admin/app/vistral-vision/
mv components/vistral-vision/* apps/super-admin/components/vistral-vision/
```

### Extraer código compartido
```bash
# Componentes UI compartidos
mv components/ui/* packages/shared-ui/components/
mv components/checklist/* packages/shared-ui/components/checklist/

# Librerías compartidas
mv lib/auth/* packages/shared-lib/auth/
mv lib/checklist-storage.ts packages/shared-lib/checklist/
mv lib/i18n/* packages/shared-lib/i18n/
mv hooks/* packages/shared-lib/hooks/
```

## Paso 7: Configurar Next.js para cada app

### apps/partner/next.config.js
```javascript
const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vistral/shared-ui', '@vistral/shared-lib'],
};

module.exports = nextConfig;
```

## Paso 8: Configurar TypeScript Paths

### apps/partner/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@vistral/shared-ui/*": ["../../packages/shared-ui/*"],
      "@vistral/shared-lib/*": ["../../packages/shared-lib/*"],
      "@vistral/shared-types/*": ["../../packages/shared-types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Paso 9: Setup Vercel

### Crear proyectos en Vercel

1. **Partner:**
   - Root Directory: `apps/partner`
   - Framework Preset: Next.js
   - Build Command: `cd ../.. && turbo build --filter=@vistral/partner`
   - Output Directory: `.next`

2. **Reno:**
   - Root Directory: `apps/reno`
   - Framework Preset: Next.js
   - Build Command: `cd ../.. && turbo build --filter=@vistral/reno`
   - Output Directory: `.next`

3. **Super Admin:**
   - Root Directory: `apps/super-admin`
   - Framework Preset: Next.js
   - Build Command: `cd ../.. && turbo build --filter=@vistral/super-admin`
   - Output Directory: `.next`

## Paso 10: Variables de Entorno en Vercel

Para cada proyecto en Vercel, configurar:

**Partner (Staging):**
- `NEXT_PUBLIC_APP_ENV=staging`
- `NEXT_PUBLIC_SUPABASE_URL=https://partner-staging.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key`

**Partner (Production):**
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL=https://partner-prod.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key`

Similar para Reno y Super Admin.

## Paso 11: GitHub Actions

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

## Paso 12: Dominios Personalizados (Opcional)

En Vercel, configurar dominios:

- `partner.vistral.com` → Partner app
- `reno.vistral.com` → Reno app
- `admin.vistral.com` → Super Admin app

Staging:
- `partner-staging.vistral.com`
- `reno-staging.vistral.com`
- `admin-staging.vistral.com`

