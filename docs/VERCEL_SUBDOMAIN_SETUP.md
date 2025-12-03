# 🌐 Configurar Subdominio en Vercel (subdominio.vistral.io)

## 📋 Paso 1: Configurar el Subdominio en Vercel

### 1.1 Ir a Settings → Domains

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Domains**

### 1.2 Agregar el Subdominio

1. En el campo de texto, escribe el subdominio que quieras usar:
   - Ejemplos: `app.vistral.io`, `dev.vistral.io`, `staging.vistral.io`
   - **Recomendado**: `app.vistral.io` para producción

2. Click en **"Add"** o **"Add Domain"**

### 1.3 Verificar la Configuración

Vercel te mostrará el registro DNS que necesitas configurar. Para un subdominio, será un **registro CNAME**:

```
Type: CNAME
Name: app (o el subdominio que elegiste)
Value: cname.vercel-dns.com
```

**Anota este valor** - lo necesitarás en GoDaddy.

## 📋 Paso 2: Configurar DNS en GoDaddy

### 2.1 Acceder a GoDaddy DNS

1. Ve a [godaddy.com](https://godaddy.com)
2. Inicia sesión
3. Ve a **My Products** → **Domains**
4. Click en `vistral.io` (el dominio principal)
5. Click en **"DNS"** o **"Manage DNS"**

### 2.2 Agregar Registro CNAME para el Subdominio

1. Click en **"Add"** o **"Add Record"**
2. Configura:
   - **Type**: `CNAME`
   - **Name**: `app` (o el subdominio que elegiste, sin `.vistral.io`)
   - **Value**: `cname.vercel-dns.com` (o el que Vercel te dio)
   - **TTL**: `600` (o el que prefieras)

3. Click en **"Save"** o **"Add Record"**

### 2.3 Ejemplo de Configuración

Si quieres usar `app.vistral.io`:

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 600
```

Esto creará: `app.vistral.io` → apunta a Vercel

## ⏳ Paso 3: Esperar Propagación DNS

La propagación DNS para subdominios suele ser más rápida:
- **Mínimo**: 5-10 minutos
- **Típico**: 15-30 minutos
- **Máximo**: 1-2 horas

### Verificar Propagación

Puedes verificar si el DNS está propagado:

```bash
# Verificar registro CNAME
dig app.vistral.io CNAME
```

O usa herramientas online:
- [whatsmydns.net](https://www.whatsmydns.net/#CNAME/app.vistral.io)
- [dnschecker.org](https://dnschecker.org)

## ✅ Paso 4: Verificar en Vercel

1. Ve a Vercel Dashboard → **Settings** → **Domains**
2. Deberías ver `app.vistral.io` (o tu subdominio) con estado:
   - ⏳ **Pending** - Esperando propagación DNS
   - ✅ **Valid** - Subdominio configurado correctamente
   - ❌ **Invalid** - Hay un problema con la configuración

### Si está en "Pending"

Espera unos minutos y recarga la página. Vercel verificará automáticamente.

### Si está en "Invalid"

1. Verifica que el registro CNAME está correcto en GoDaddy
2. Verifica que el nombre del registro es solo `app` (sin `.vistral.io`)
3. Espera más tiempo para la propagación

## 🔧 Paso 5: Actualizar Variables de Entorno

Una vez que el subdominio esté funcionando:

### En Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega o actualiza:
   ```
   Key: NEXT_PUBLIC_APP_URL
   Value: https://app.vistral.io (o tu subdominio)
   Environment: Production, Preview, Development
   ```

Esto ayudará con:
- Configuración automática del webhook de Airtable
- URLs absolutas en la aplicación
- Redirecciones correctas

## 🧪 Paso 6: Probar el Subdominio

Una vez que Vercel muestre el subdominio como "Valid":

1. Abre `https://app.vistral.io` (o tu subdominio) en tu navegador
2. Deberías ver tu aplicación funcionando
3. Verifica que HTTPS funciona (Vercel lo configura automáticamente)

## 🔄 Paso 7: Configurar Webhook con el Nuevo Subdominio

Después de que el subdominio esté funcionando:

```bash
# El webhook ahora usará el subdominio personalizado
NEXT_PUBLIC_APP_URL=https://app.vistral.io npm run setup:airtable-webhook
```

O manualmente en Airtable:
- URL: `https://app.vistral.io/api/webhooks/airtable`

## 📝 Múltiples Subdominios

Si quieres configurar múltiples subdominios (ej: `dev.vistral.io`, `staging.vistral.io`):

1. Repite el proceso para cada subdominio en Vercel
2. Agrega un registro CNAME por cada uno en GoDaddy:
   ```
   dev → cname.vercel-dns.com
   staging → cname.vercel-dns.com
   app → cname.vercel-dns.com
   ```

Cada subdominio puede apuntar a diferentes proyectos de Vercel si quieres.

## 🐛 Troubleshooting

### El subdominio no se verifica

1. **Verifica el registro CNAME** en GoDaddy:
   - El nombre debe ser solo `app` (no `app.vistral.io`)
   - El valor debe ser `cname.vercel-dns.com`
2. **Espera más tiempo** (puede tardar hasta 2 horas)
3. **Verifica que no hay errores** en los valores
4. **Elimina y vuelve a agregar** el subdominio en Vercel

### El subdominio carga pero muestra error

1. **Verifica que el deploy está activo** en Vercel
2. **Revisa los logs** en Vercel Dashboard
3. **Verifica las variables de entorno** están configuradas

### HTTPS no funciona

Vercel configura HTTPS automáticamente. Si no funciona:
1. Espera unos minutos más
2. Verifica que el subdominio está verificado en Vercel
3. Vercel emitirá el certificado SSL automáticamente

## ✅ Checklist Final

- [ ] Subdominio agregado en Vercel (ej: `app.vistral.io`)
- [ ] Registro CNAME configurado en GoDaddy
- [ ] Esperado propagación DNS (15-30 minutos)
- [ ] Subdominio verificado en Vercel (estado "Valid")
- [ ] `https://app.vistral.io` funciona correctamente
- [ ] HTTPS funciona automáticamente
- [ ] Variables de entorno actualizadas
- [ ] Webhook de Airtable actualizado con nuevo subdominio

## 🎉 ¡Listo!

Una vez completado, tu aplicación estará disponible en:
- **Producción**: `https://app.vistral.io` (o tu subdominio)
- **Preview deployments**: `https://[branch-name]-tu-proyecto.vercel.app`

## 💡 Recomendaciones de Subdominios

- `app.vistral.io` - Para producción
- `dev.vistral.io` - Para desarrollo/staging
- `staging.vistral.io` - Para pruebas antes de producción
- `admin.vistral.io` - Para panel de administración (si aplica)









