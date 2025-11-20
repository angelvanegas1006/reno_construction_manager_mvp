# Guía de Deployment en Vercel

## 🚀 Setup Inicial

### 1. Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con GitHub
3. Conecta tu repositorio

### 2. Crear Proyectos

Para cada app, crear un proyecto separado:

#### Partner App
1. **New Project** → Seleccionar repositorio
2. **Project Name:** `vistral-partner`
3. **Framework Preset:** Next.js
4. **Root Directory:** `apps/partner`
5. **Build Command:** `cd ../.. && npm run build --filter=@vistral/partner`
6. **Output Directory:** `.next`
7. **Install Command:** `npm install`

#### Reno App
1. **New Project** → Seleccionar repositorio
2. **Project Name:** `vistral-reno`
3. **Framework Preset:** Next.js
4. **Root Directory:** `apps/reno`
5. **Build Command:** `cd ../.. && npm run build --filter=@vistral/reno`
6. **Output Directory:** `.next`
7. **Install Command:** `npm install`

#### Super Admin App
1. **New Project** → Seleccionar repositorio
2. **Project Name:** `vistral-super-admin`
3. **Framework Preset:** Next.js
4. **Root Directory:** `apps/super-admin`
5. **Build Command:** `cd ../.. && npm run build --filter=@vistral/super-admin`
6. **Output Directory:** `.next`
7. **Install Command:** `npm install`

---

## 🌍 Configuración de Entornos

### Staging Environment

Para cada proyecto, crear un **Preview Deployment** para staging:

1. **Settings** → **Git**
2. **Production Branch:** `main`
3. **Preview Branches:** `staging`

O crear proyectos separados:
- `vistral-partner-staging`
- `vistral-reno-staging`
- `vistral-super-admin-staging`

### Variables de Entorno

#### Partner - Staging
```
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://partner-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
NEXT_PUBLIC_API_URL=https://api-staging.vistral.com
```

#### Partner - Production
```
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://partner-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
NEXT_PUBLIC_API_URL=https://api.vistral.com
```

---

## 🔗 Dominios Personalizados

### Configurar Dominios

1. **Settings** → **Domains**
2. Agregar dominio:
   - `partner.vistral.com` → Partner app
   - `reno.vistral.com` → Reno app
   - `admin.vistral.com` → Super Admin app

### Staging Domains
- `partner-staging.vistral.com`
- `reno-staging.vistral.com`
- `admin-staging.vistral.com`

---

## 📋 Checklist de Deployment

### Pre-Deployment
- [ ] Variables de entorno configuradas
- [ ] Supabase projects creados por entorno
- [ ] Tests pasando
- [ ] Build exitoso localmente

### Deployment Staging
- [ ] Push a branch `staging`
- [ ] Verificar deploy automático
- [ ] Probar en staging URL
- [ ] Verificar que todas las funcionalidades funcionan

### Deployment Production
- [ ] Merge a `main`
- [ ] Verificar deploy automático
- [ ] Probar en production URL
- [ ] Monitorear errores
- [ ] Notificar al equipo

---

## 🔄 Workflow de Deployment

```
1. Desarrollo local
   ↓
2. Push a feature branch
   ↓
3. Crear PR → Preview deployment automático
   ↓
4. Review y testing en preview
   ↓
5. Merge a `staging` → Deploy automático a staging
   ↓
6. Testing en staging
   ↓
7. Merge a `main` → Deploy automático a production
```

---

## 🐛 Troubleshooting

### Build Fails
- Verificar que todas las dependencias están en `package.json`
- Verificar paths de imports
- Verificar variables de entorno

### Deploy Fails
- Revisar logs en Vercel dashboard
- Verificar que el build funciona localmente
- Verificar configuración de root directory

### Runtime Errors
- Verificar variables de entorno
- Verificar que Supabase está configurado correctamente
- Revisar logs en Vercel dashboard

