# 🏗️ Setup de Entornos (Dev, Staging, Production)

Esta guía te ayudará a configurar los tres entornos necesarios para la arquitectura de Vistral.

---

## 📋 Resumen de Entornos

| Entorno | URL | Supabase Project | Propósito |
|---------|-----|------------------|-----------|
| **Development** | `localhost:3000` | `vistral-dev` | Desarrollo local |
| **Staging** | `staging.vistral.com` | `vistral-staging` | Pruebas antes de producción |
| **Production** | `vistral.com` | `vistral-prod` | Entorno de producción |

---

## 🚀 Paso 1: Crear Proyectos Supabase

### **1.1 Development Project**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Click en **"New Project"**
3. Configuración:
   - **Name**: `vistral-dev`
   - **Database Password**: Genera una segura
   - **Region**: Más cercana a tu ubicación
   - **Pricing Plan**: Free tier está bien para dev
4. Espera a que se cree el proyecto (~2 minutos)
5. Copia las credenciales:
   - Settings → API → **Project URL**
   - Settings → API → **anon public** key
   - Settings → API → **service_role** key (⚠️ secreto)

### **1.2 Staging Project**

Repite el proceso anterior con:
- **Name**: `vistral-staging`
- **Region**: Misma que production (para consistencia)
- **Pricing Plan**: Free tier o Pro (según necesidades)

### **1.3 Production Project**

Repite el proceso anterior con:
- **Name**: `vistral-prod`
- **Region**: Más cercana a tus usuarios
- **Pricing Plan**: Pro (recomendado para producción)

---

## 📁 Paso 2: Configurar Archivos de Entorno

### **2.1 Development (.env.local)**

```bash
# En la raíz del proyecto
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# Supabase Development
NEXT_PUBLIC_SUPABASE_URL=https://vistral-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-dev-service-role-key

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=true
```

### **2.2 Staging (.env.staging)**

```bash
cp .env.example .env.staging
```

Edita `.env.staging`:

```env
NEXT_PUBLIC_APP_ENV=staging
NODE_ENV=production

# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=https://vistral-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-staging-service-role-key

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=true
```

### **2.3 Production (.env.production)**

```bash
cp .env.example .env.production
```

Edita `.env.production`:

```env
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production

# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://vistral-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-prod-service-role-key

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=false
```

---

## 🗄️ Paso 3: Ejecutar Migraciones en Cada Entorno

### **3.1 Migraciones SQL**

Todas las migraciones están en: `supabase/migrations/001_checklist_migrations.sql`

### **3.2 Development**

1. Ve a tu proyecto `vistral-dev` en Supabase Dashboard
2. SQL Editor → New Query
3. Copia y pega el contenido de `supabase/migrations/001_checklist_migrations.sql`
4. Ejecuta el query
5. Verifica que las tablas se crearon:
   - `property_inspections`
   - `inspection_zones`
   - `inspection_elements`
   - `event_store` (para Event Bus)

### **3.3 Staging**

Repite el proceso anterior en `vistral-staging`

### **3.4 Production**

Repite el proceso anterior en `vistral-prod`

**⚠️ IMPORTANTE**: En producción, ejecuta las migraciones en horario de bajo tráfico y haz backup primero.

---

## 🔧 Paso 4: Configurar Event Bus en Cada Entorno

El Event Bus usa Supabase Realtime, que funciona automáticamente una vez que:

1. ✅ Las migraciones están ejecutadas (tabla `event_store` existe)
2. ✅ Las funciones PostgreSQL están creadas (`publish_event`, `store_event`)
3. ✅ Realtime está habilitado en Supabase Dashboard

### **Verificar Realtime**

En cada proyecto Supabase:
1. Settings → API → Realtime
2. Verifica que está habilitado
3. Verifica que las tablas necesarias tienen Realtime habilitado:
   - `event_store` → Realtime enabled ✅

---

## 🧪 Paso 5: Probar Cada Entorno

### **5.1 Development**

```bash
npm run dev
```

Abre `http://localhost:3000` y verifica:
- ✅ Login funciona
- ✅ Checklist carga
- ✅ Event Bus funciona (revisa console logs si `ENABLE_EVENT_BUS_LOGGING=true`)

### **5.2 Staging**

```bash
npm run build:staging
npm run start:staging
```

O deploy a Vercel (ver Paso 6)

### **5.3 Production**

```bash
npm run build:prod
npm run start:prod
```

O deploy a Vercel (ver Paso 6)

---

## 🚀 Paso 6: Configurar Vercel (Deployment)

### **6.1 Crear Proyectos en Vercel**

Para cada app (Partner, Reno, Super Admin):

**Staging Projects:**
- `vistral-partner-staging`
- `vistral-reno-staging`
- `vistral-super-admin-staging`

**Production Projects:**
- `vistral-partner-prod`
- `vistral-reno-prod`
- `vistral-super-admin-prod`

### **6.2 Configurar Variables de Entorno en Vercel**

Para cada proyecto, ve a **Settings → Environment Variables**:

**Staging Projects:**
```
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://vistral-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=true
```

**Production Projects:**
```
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://vistral-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=false
```

### **6.3 Configurar Branches**

**Staging:**
- Branch: `staging`
- Auto-deploy: ✅ Enabled

**Production:**
- Branch: `main`
- Auto-deploy: ✅ Enabled (o manual según preferencia)

---

## ✅ Checklist de Setup

### **Development**
- [ ] Proyecto Supabase `vistral-dev` creado
- [ ] `.env.local` configurado con credenciales de dev
- [ ] Migraciones ejecutadas en dev
- [ ] Event Bus funciona (tabla `event_store` existe)
- [ ] `npm run dev` funciona correctamente
- [ ] Login funciona
- [ ] Checklist carga datos

### **Staging**
- [ ] Proyecto Supabase `vistral-staging` creado
- [ ] `.env.staging` configurado con credenciales de staging
- [ ] Migraciones ejecutadas en staging
- [ ] Event Bus funciona (tabla `event_store` existe)
- [ ] Proyectos Vercel creados para staging
- [ ] Variables de entorno configuradas en Vercel
- [ ] Branch `staging` creado en Git
- [ ] Auto-deploy configurado en Vercel
- [ ] Deploy exitoso a staging

### **Production**
- [ ] Proyecto Supabase `vistral-prod` creado
- [ ] `.env.production` configurado con credenciales de prod
- [ ] Migraciones ejecutadas en prod
- [ ] Event Bus funciona (tabla `event_store` existe)
- [ ] Backup de base de datos creado
- [ ] Proyectos Vercel creados para production
- [ ] Variables de entorno configuradas en Vercel
- [ ] Dominio personalizado configurado
- [ ] SSL/HTTPS configurado
- [ ] Monitoring y alerting configurado
- [ ] Deploy exitoso a production

---

## 🔄 Flujo de Trabajo Recomendado

```
1. Desarrollo Local (dev)
   ↓
2. Commit a branch `staging`
   ↓
3. Auto-deploy a Staging
   ↓
4. Testing en Staging
   ↓
5. Merge a `main`
   ↓
6. Deploy a Production
```

---

## 🐛 Troubleshooting

### **Error: "Missing Supabase environment variables"**

Verifica que:
- ✅ El archivo `.env.local` existe
- ✅ Las variables están correctamente escritas
- ✅ No hay espacios extra en las variables
- ✅ Estás usando el proyecto correcto (dev/staging/prod)

### **Error: "Table does not exist"**

Ejecuta las migraciones SQL en el proyecto Supabase correspondiente.

### **Event Bus no funciona**

Verifica que:
- ✅ La tabla `event_store` existe
- ✅ Las funciones `publish_event` y `store_event` existen
- ✅ Realtime está habilitado en Supabase Dashboard
- ✅ La tabla `event_store` tiene Realtime habilitado

### **Deploy falla en Vercel**

Verifica que:
- ✅ Todas las variables de entorno están configuradas en Vercel
- ✅ El branch correcto está configurado (staging/production)
- ✅ El build pasa localmente (`npm run build`)

---

## 📚 Recursos Adicionales

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Event Bus Setup Guide](./event-bus-setup-guide.md)
- [Environment Quick Start](./ENVIRONMENT_QUICK_START.md)

---

¿Necesitas ayuda con algún paso? Revisa la documentación o pregunta al equipo.

