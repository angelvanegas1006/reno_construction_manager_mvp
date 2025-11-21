# Plan de Separación de Apps y Deployment a la Nube

## 📋 Resumen Ejecutivo

Este documento describe el plan para separar las aplicaciones (Partner, Reno, Super Admin) en módulos independientes, crear un entorno de pruebas (staging), y configurar el deployment a la nube.

---

## 🏗️ Arquitectura Propuesta

### Opción 1: Monorepo con Múltiples Apps (Recomendado)

```
vistral-mvp/
├── apps/
│   ├── partner/          # App Partner (Next.js)
│   ├── reno/              # App Reno Construction Manager (Next.js)
│   ├── super-admin/       # App Super Admin / Vistral Vision (Next.js)
│   └── shared/            # Componentes y utilidades compartidas
├── packages/
│   ├── ui/                # Componentes UI compartidos
│   ├── lib/                # Librerías compartidas (auth, storage, etc.)
│   └── types/             # Tipos TypeScript compartidos
├── .github/
│   └── workflows/         # CI/CD workflows
└── package.json           # Root package.json
```

**Ventajas:**
- ✅ Código compartido fácil de mantener
- ✅ Un solo repositorio
- ✅ Deploy independiente de cada app
- ✅ Testing compartido

### Opción 2: Múltiples Repositorios

```
vistral-partner/
vistral-reno/
vistral-super-admin/
vistral-shared/ (npm package privado)
```

**Ventajas:**
- ✅ Separación completa
- ✅ Permisos independientes
- ✅ Deploy completamente independiente

**Desventajas:**
- ❌ Más complejo de mantener código compartido
- ❌ Múltiples repositorios

---

## 🎯 Recomendación: Monorepo con Turborepo

Usar **Turborepo** o **Nx** para gestionar el monorepo:

```
vistral-mvp/
├── apps/
│   ├── partner/
│   │   ├── app/
│   │   ├── components/
│   │   ├── package.json
│   │   └── next.config.js
│   ├── reno/
│   │   ├── app/
│   │   ├── components/
│   │   ├── package.json
│   │   └── next.config.js
│   └── super-admin/
│       ├── app/
│       ├── components/
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── shared-ui/
│   ├── shared-lib/
│   └── shared-types/
├── turbo.json
└── package.json
```

---

## 📁 Estructura Detallada

### 1. Separación de Apps

#### App: Partner
```
apps/partner/
├── app/
│   ├── partner/           # Rutas específicas de partner
│   ├── layout.tsx         # Layout específico de partner
│   └── page.tsx           # Home de partner
├── components/
│   └── partner/           # Componentes específicos de partner
├── lib/
│   └── partner/           # Lógica específica de partner
├── package.json
└── next.config.js
```

#### App: Reno
```
apps/reno/
├── app/
│   ├── reno/              # Rutas específicas de reno
│   ├── layout.tsx         # Layout específico de reno
│   └── page.tsx           # Home de reno
├── components/
│   └── reno/              # Componentes específicos de reno
├── lib/
│   └── reno/              # Lógica específica de reno
├── package.json
└── next.config.js
```

#### App: Super Admin
```
apps/super-admin/
├── app/
│   ├── vistral-vision/    # Rutas específicas de super admin
│   ├── layout.tsx         # Layout específico de super admin
│   └── page.tsx           # Home de super admin
├── components/
│   └── vistral-vision/    # Componentes específicos de super admin
├── lib/
│   └── super-admin/       # Lógica específica de super admin
├── package.json
└── next.config.js
```

#### Packages Compartidos
```
packages/
├── shared-ui/
│   ├── components/        # Componentes UI compartidos
│   ├── package.json
│   └── index.ts
├── shared-lib/
│   ├── auth/              # Autenticación compartida
│   ├── storage/           # Storage compartido
│   ├── checklist/         # Lógica de checklist compartida
│   ├── property/          # Lógica de propiedades compartida
│   ├── package.json
│   └── index.ts
└── shared-types/
    ├── index.ts           # Tipos TypeScript compartidos
    └── package.json
```

---

## 🔄 Plan de Migración

### Fase 1: Setup Monorepo (Semana 1)

1. **Instalar Turborepo**
   ```bash
   npm install -g turbo
   npm create turbo@latest
   ```

2. **Reorganizar estructura**
   - Crear carpetas `apps/` y `packages/`
   - Mover código específico a cada app
   - Extraer código compartido a packages

3. **Configurar Turborepo**
   - `turbo.json` con pipelines
   - Configurar dependencias entre apps

### Fase 2: Separar Apps (Semana 2)

1. **Crear estructura de cada app**
   - Copiar `app/partner/` → `apps/partner/app/partner/`
   - Copiar `app/reno/` → `apps/reno/app/reno/`
   - Copiar `app/vistral-vision/` → `apps/super-admin/app/vistral-vision/`

2. **Extraer código compartido**
   - Componentes UI → `packages/shared-ui/`
   - Lógica compartida → `packages/shared-lib/`
   - Tipos → `packages/shared-types/`

3. **Configurar imports**
   - Usar imports desde packages compartidos
   - Actualizar paths en cada app

### Fase 3: Entornos (Semana 3)

1. **Configurar variables de entorno**
   - `.env.local` (desarrollo)
   - `.env.staging` (pruebas)
   - `.env.production` (producción)

2. **Crear configuraciones por entorno**
   - API URLs diferentes
   - Supabase projects diferentes
   - Feature flags

### Fase 4: CI/CD y Deployment (Semana 4)

1. **Setup GitHub Actions**
   - Build y test en PR
   - Deploy automático a staging
   - Deploy manual a production

2. **Configurar Vercel/Netlify**
   - Proyectos separados por app
   - Deploy automático desde branches

---

## 🌐 Configuración de Entornos

### Variables de Entorno

#### Desarrollo (Local)
```env
# .env.local
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-key
```

#### Staging (Pruebas)
```env
# .env.staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_API_URL=https://api-staging.vistral.com
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key
```

#### Production
```env
# .env.production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://api.vistral.com
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key
```

---

## 🚀 Deployment a la Nube

### Opción 1: Vercel (Recomendado para Next.js)

**Ventajas:**
- ✅ Optimizado para Next.js
- ✅ Deploy automático desde Git
- ✅ Preview deployments
- ✅ Edge functions
- ✅ Free tier generoso

**Configuración:**

1. **Crear proyectos en Vercel:**
   - `vistral-partner`
   - `vistral-reno`
   - `vistral-super-admin`

2. **Configurar monorepo:**
   ```json
   // vercel.json (root)
   {
     "projects": [
       {
         "name": "vistral-partner",
         "root": "apps/partner",
         "framework": "nextjs"
       },
       {
         "name": "vistral-reno",
         "root": "apps/reno",
         "framework": "nextjs"
       },
       {
         "name": "vistral-super-admin",
         "root": "apps/super-admin",
         "framework": "nextjs"
       }
     ]
   }
   ```

3. **URLs resultantes:**
   - Partner: `https://partner.vistral.com` o `https://vistral-partner.vercel.app`
   - Reno: `https://reno.vistral.com` o `https://vistral-reno.vercel.app`
   - Super Admin: `https://admin.vistral.com` o `https://vistral-super-admin.vercel.app`

### Opción 2: AWS Amplify

**Ventajas:**
- ✅ Integración con AWS
- ✅ Más control
- ✅ Escalabilidad

**Configuración:**
- Crear apps en Amplify Console
- Conectar repositorio
- Configurar build settings

### Opción 3: Docker + Kubernetes

**Para más control:**
- Containerizar cada app
- Deploy en Kubernetes
- Más complejo pero más flexible

---

## 🔐 Seguridad y Autenticación

### Separación de Accesos

1. **Subdominios diferentes:**
   - `partner.vistral.com` → Solo usuarios Partner
   - `reno.vistral.com` → Solo usuarios Reno
   - `admin.vistral.com` → Solo Super Admin

2. **Middleware de autenticación:**
   ```typescript
   // apps/partner/middleware.ts
   export function middleware(request: NextRequest) {
     const user = getSession(request);
     if (!user || user.role !== 'partner') {
       return NextResponse.redirect('/login');
     }
   }
   ```

3. **Supabase Projects separados:**
   - `vistral-partner-dev` (dev)
   - `vistral-partner-staging` (staging)
   - `vistral-partner-prod` (production)
   - Similar para Reno y Super Admin

---

## 📦 Gestión de Dependencias

### Root `package.json`
```json
{
  "name": "vistral-mvp",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### App `package.json` (ejemplo: partner)
```json
{
  "name": "@vistral/partner",
  "version": "1.0.0",
  "dependencies": {
    "@vistral/shared-ui": "workspace:*",
    "@vistral/shared-lib": "workspace:*",
    "@vistral/shared-types": "workspace:*",
    "next": "16.0.1",
    "react": "19.2.0"
  }
}
```

---

## 🧪 Entorno de Pruebas (Staging)

### Setup Staging

1. **Base de datos separada:**
   - Supabase project para staging
   - Datos de prueba
   - Reset periódico

2. **URLs de staging:**
   - `partner-staging.vistral.com`
   - `reno-staging.vistral.com`
   - `admin-staging.vistral.com`

3. **Deploy automático:**
   - Push a `staging` branch → Deploy automático
   - Preview deployments en PRs

4. **Testing:**
   - Tests E2E en staging
   - Smoke tests antes de production

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
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
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_PARTNER }}
          working-directory: ./apps/partner
```

---

## 📝 Checklist de Implementación

### Fase 1: Setup Monorepo
- [ ] Instalar Turborepo
- [ ] Crear estructura de carpetas
- [ ] Configurar `turbo.json`
- [ ] Configurar workspaces en `package.json`
- [ ] Migrar código a nuevas ubicaciones

### Fase 2: Separar Apps
- [ ] Crear `apps/partner/`
- [ ] Crear `apps/reno/`
- [ ] Crear `apps/super-admin/`
- [ ] Extraer código compartido a `packages/`
- [ ] Actualizar imports en todas las apps
- [ ] Verificar que cada app funciona independientemente

### Fase 3: Entornos
- [ ] Crear `.env.local`, `.env.staging`, `.env.production`
- [ ] Configurar Supabase projects por entorno
- [ ] Setup variables de entorno en Vercel
- [ ] Crear scripts de build por entorno

### Fase 4: CI/CD
- [ ] Configurar GitHub Actions
- [ ] Setup Vercel projects
- [ ] Configurar deploy automático a staging
- [ ] Configurar deploy manual a production
- [ ] Setup preview deployments

### Fase 5: Testing
- [ ] Verificar que cada app funciona en staging
- [ ] Tests E2E en staging
- [ ] Verificar que no hay conflictos entre apps
- [ ] Documentar proceso de deploy

---

## 🎯 Próximos Pasos Inmediatos

1. **Decidir arquitectura:**
   - Monorepo con Turborepo (recomendado)
   - O múltiples repositorios

2. **Setup inicial:**
   ```bash
   # Instalar Turborepo
   npm install -g turbo
   
   # Crear estructura
   mkdir -p apps/partner apps/reno apps/super-admin
   mkdir -p packages/shared-ui packages/shared-lib packages/shared-types
   ```

3. **Migración gradual:**
   - Empezar con una app (ej: Partner)
   - Mover código compartido
   - Verificar que funciona
   - Repetir con otras apps

---

## 💡 Recomendaciones

1. **Empezar con Monorepo:**
   - Más fácil de mantener código compartido
   - Un solo repositorio
   - Deploy independiente pero coordinado

2. **Usar Vercel:**
   - Optimizado para Next.js
   - Deploy automático
   - Preview deployments
   - Free tier generoso

3. **Staging obligatorio:**
   - Siempre probar en staging antes de production
   - Datos de prueba separados
   - Reset periódico de staging

4. **Variables de entorno:**
   - Nunca hardcodear URLs o keys
   - Usar diferentes proyectos Supabase por entorno
   - Documentar todas las variables

---

¿Quieres que empecemos con alguna fase específica? Puedo ayudarte a:
- Setup inicial del monorepo
- Migrar código a la nueva estructura
- Configurar CI/CD
- Setup de Vercel

