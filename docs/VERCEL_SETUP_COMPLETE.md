# 🚀 Configuración Completa de Vercel - Guía Paso a Paso

## ✅ Lo que ya tienes

- ✅ Cuenta de Vercel creada
- ✅ Vercel instalado en Git
- ✅ Proyecto Next.js listo para deploy

## 📋 Paso 1: Conectar Repositorio en Vercel

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click en **"Add New..."** → **"Project"**
3. Selecciona tu repositorio de GitHub
4. Vercel detectará automáticamente que es Next.js

## ⚙️ Paso 2: Configurar el Proyecto

### Configuración Básica

- **Project Name**: `vistral-mvp` (o el nombre que prefieras)
- **Framework Preset**: Next.js (detectado automáticamente)
- **Root Directory**: `./` (raíz del proyecto)
- **Build Command**: `npm run build` (automático)
- **Output Directory**: `.next` (automático)
- **Install Command**: `npm install` (automático)

### Configuración Avanzada (Opcional)

- **Node.js Version**: 20.x (recomendado)
- **Region**: `iad1` (US East) o la más cercana a tus usuarios

## 🔐 Paso 3: Configurar Variables de Entorno

Ve a **Settings** → **Environment Variables** y agrega:

### Variables Requeridas (Producción)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Airtable
NEXT_PUBLIC_AIRTABLE_API_KEY=patXXXXXXXXXXXXXX (tu API key de Airtable)
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties

# Webhook Security (opcional pero recomendado)
AIRTABLE_WEBHOOK_SECRET=tu_secret_aqui
```

### Variables Automáticas de Vercel

Vercel configura automáticamente:
- `VERCEL_URL` - URL del deployment (ej: `vistral-mvp.vercel.app`)
- `VERCEL_ENV` - Entorno (`production`, `preview`, `development`)

**Nota**: No necesitas configurar `NEXT_PUBLIC_APP_URL` manualmente. El webhook usará `VERCEL_URL` automáticamente.

## 🎯 Paso 4: Configurar Branches

### Production Branch

1. Ve a **Settings** → **Git**
2. **Production Branch**: `main`
3. **Auto-deploy**: ✅ Enabled

### Preview Branches (Opcional)

- Cualquier branch que no sea `main` creará un preview deployment automáticamente
- Útil para testing antes de mergear a `main`

## 🚀 Paso 5: Hacer el Primer Deploy

### Opción 1: Deploy Automático desde Git

1. Haz push a `main`:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. Vercel detectará el push y hará deploy automáticamente

### Opción 2: Deploy Manual desde Vercel Dashboard

1. Ve a tu proyecto en Vercel
2. Click en **"Deployments"** → **"Deploy"**
3. Selecciona el branch `main`

## 🔗 Paso 6: Configurar Webhook de Airtable (Después del Deploy)

Una vez que tengas la URL de producción:

### Opción 1: Automático (Recomendado)

Después del primer deploy, ejecuta:

```bash
# El script detectará VERCEL_URL automáticamente
npm run setup:airtable-webhook
```

O desde el código, después del deploy:

```typescript
// Esto se ejecutará automáticamente cuando se llame al endpoint
// POST /api/airtable/setup-webhook
```

### Opción 2: Manual desde Vercel Dashboard

1. Ve a tu deployment en Vercel
2. Copia la URL (ej: `https://vistral-mvp.vercel.app`)
3. Ve a Airtable → Extensions → Webhooks
4. Crea webhook con URL: `https://vistral-mvp.vercel.app/api/webhooks/airtable`

## 🌐 Paso 7: Configurar Dominio Personalizado (Opcional)

Si tienes un dominio:

1. Ve a **Settings** → **Domains**
2. Agrega tu dominio (ej: `vistral.com`)
3. Sigue las instrucciones para configurar DNS
4. Vercel te dará los registros DNS necesarios

## 📊 Paso 8: Verificar el Deploy

### Checklist de Verificación

- [ ] Build exitoso en Vercel
- [ ] URL de producción funcionando
- [ ] Login funciona correctamente
- [ ] Supabase conectado
- [ ] Airtable sincronización funciona
- [ ] Webhook de Airtable configurado

### Probar la Aplicación

1. Abre la URL de producción
2. Prueba login
3. Prueba mover una propiedad en el Kanban
4. Verifica que se sincroniza con Airtable
5. Actualiza un campo en Airtable
6. Verifica que se actualiza en la app

## 🔄 Workflow de Deployment

```
1. Desarrollo local
   ↓
2. Commit y push a feature branch
   ↓
3. Crear PR → Preview deployment automático
   ↓
4. Review y testing en preview
   ↓
5. Merge a `main` → Deploy automático a producción
   ↓
6. Verificar que todo funciona
```

## 🛠️ Comandos Útiles

### Ver logs en tiempo real

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Ver logs
vercel logs
```

### Deploy manual desde CLI

```bash
vercel --prod
```

### Ver variables de entorno

```bash
vercel env ls
```

## 🐛 Troubleshooting

### Build Fails

1. Verifica que el build funciona localmente:
   ```bash
   npm run build
   ```

2. Revisa los logs en Vercel Dashboard → Deployments → [tu deployment] → Build Logs

3. Verifica variables de entorno:
   - Settings → Environment Variables
   - Asegúrate de que todas las variables están configuradas

### Runtime Errors

1. Revisa Function Logs en Vercel Dashboard
2. Verifica que Supabase está accesible
3. Verifica que las variables de entorno están correctas

### Webhook no funciona

1. Verifica que la URL del webhook es correcta:
   ```bash
   curl https://tu-app.vercel.app/api/webhooks/airtable
   # Debería responder: {"status":"ok",...}
   ```

2. Verifica que `AIRTABLE_WEBHOOK_SECRET` está configurado si lo usas

3. Revisa los logs del webhook en Vercel Dashboard

## 📝 Variables de Entorno por Entorno

### Production (main branch)

Todas las variables configuradas en **Settings** → **Environment Variables** → **Production**

### Preview (otras branches)

Las mismas variables pero puedes sobrescribir para testing

### Development (local)

Usa `.env.local` (no se sube a Git)

## ✅ Checklist Final

- [ ] Proyecto conectado a Vercel
- [ ] Variables de entorno configuradas
- [ ] Primer deploy exitoso
- [ ] URL de producción funcionando
- [ ] Webhook de Airtable configurado
- [ ] Dominio personalizado configurado (si aplica)
- [ ] Testing completo realizado

## 🎉 ¡Listo!

Tu aplicación está desplegada en Vercel y funcionando en la nube. Cada push a `main` hará deploy automático.

