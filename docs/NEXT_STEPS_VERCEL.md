# 🚀 Siguientes Pasos - Deployment en Vercel

## ✅ Lo que ya tienes

- ✅ Variables de entorno configuradas en Vercel
- ✅ Proyecto conectado a Git
- ✅ Credenciales de Supabase y Airtable configuradas

## 📋 Paso 1: Hacer el Primer Deploy

### Opción A: Deploy Automático desde Git (Recomendado)

1. **Haz commit y push de tus cambios:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Vercel detectará el push automáticamente** y comenzará el deploy

3. **Ve a Vercel Dashboard** → **Deployments** para ver el progreso

### Opción B: Deploy Manual desde Vercel

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Click en **"Deployments"** → **"Deploy"**
4. Selecciona el branch `main`
5. Click **"Deploy"**

## ⏳ Paso 2: Esperar el Deploy

El deploy puede tomar 2-5 minutos. Verás:

1. **Building** - Compilando la aplicación
2. **Deploying** - Desplegando en la nube
3. **Ready** - ✅ Deploy completado

## 🔗 Paso 3: Obtener la URL de Producción

Una vez que el deploy esté listo:

1. Ve a **Deployments** → Click en el último deployment
2. Verás la **URL de producción** (ej: `https://vistral-mvp.vercel.app`)
3. **Copia esta URL** - la necesitarás para el webhook

## 🔧 Paso 4: Configurar Webhook de Airtable

Después del primer deploy exitoso, configura el webhook:

### Opción A: Automático (Recomendado)

1. **Obtén la URL de producción** de Vercel (ej: `https://vistral-mvp.vercel.app`)

2. **Ejecuta el script** (desde tu máquina local):
   ```bash
   # Configura la URL de producción temporalmente
   VERCEL_URL=https://tu-app.vercel.app npm run setup:airtable-webhook
   ```

   O configura la variable en Vercel y luego:
   ```bash
   npm run setup:airtable-webhook
   ```

### Opción B: Manual desde Airtable

1. Ve a Airtable → Tu base → **Extensions** → **Webhooks**
2. Click en **"Create a webhook"**
3. Configura:
   - **Name**: "Vistral Sync"
   - **URL**: `https://tu-app.vercel.app/api/webhooks/airtable`
   - **Specify events**: "When records are created or updated"
   - **Table**: "Properties"
   - **Fields to watch**: Selecciona los campos que quieres monitorear

## 🧪 Paso 5: Probar la Aplicación

### Checklist de Pruebas

1. **Abrir la URL de producción**
   - Debería cargar sin errores
   - Verifica que no hay errores en la consola

2. **Probar Login**
   - Intenta iniciar sesión
   - Verifica que Supabase está conectado

3. **Probar Kanban**
   - Abre el Kanban
   - Verifica que las propiedades cargan
   - Intenta mover una propiedad entre columnas

4. **Probar Sincronización App → Airtable**
   - Mueve una propiedad en el Kanban
   - Ve a Airtable y verifica que el campo "Set Up Status" se actualizó

5. **Probar Sincronización Airtable → App**
   - Actualiza un campo en Airtable (ej: "Set Up Status")
   - Verifica que se actualiza en la app (puede tomar unos segundos)

6. **Verificar Logs**
   - Ve a Vercel Dashboard → **Functions** → **Logs**
   - Verifica que no hay errores

## 🐛 Paso 6: Troubleshooting (Si algo falla)

### Build Fails

1. **Revisa los logs** en Vercel Dashboard → Deployments → [tu deployment] → Build Logs
2. **Verifica que el build funciona localmente:**
   ```bash
   npm run build
   ```
3. **Verifica variables de entorno** en Vercel Dashboard

### Runtime Errors

1. **Revisa Function Logs** en Vercel Dashboard
2. **Verifica que Supabase está accesible**
3. **Verifica que las variables de entorno están correctas**

### Webhook no funciona

1. **Verifica que el endpoint está activo:**
   ```bash
   curl https://tu-app.vercel.app/api/webhooks/airtable
   # Debería responder: {"status":"ok",...}
   ```

2. **Verifica que el webhook está configurado en Airtable**
3. **Revisa los logs del webhook** en Vercel Dashboard

## ✅ Checklist Final

- [ ] Deploy exitoso en Vercel
- [ ] URL de producción funcionando
- [ ] Login funciona correctamente
- [ ] Kanban carga y funciona
- [ ] Sincronización App → Airtable funciona
- [ ] Webhook de Airtable configurado
- [ ] Sincronización Airtable → App funciona (opcional, probar después)

## 🎉 ¡Listo!

Una vez que completes estos pasos, tu aplicación estará:
- ✅ Desplegada en la nube
- ✅ Accesible desde cualquier lugar
- ✅ Con sincronización bidireccional con Airtable
- ✅ Con deploy automático en cada push a `main`

## 📝 Próximos Pasos Opcionales

1. **Configurar dominio personalizado** (si tienes uno)
2. **Configurar variables de producción** (si usas un proyecto diferente de Supabase)
3. **Configurar notificaciones** de deploy
4. **Monitorear performance** y errores


