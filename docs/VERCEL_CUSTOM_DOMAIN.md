# 🌐 Configurar Dominio Personalizado en Vercel

**Nota**: Si quieres usar un subdominio (ej: `app.vistral.io`), ve a `VERCEL_SUBDOMAIN_SETUP.md`

## 📋 Paso 1: Configurar el Dominio en Vercel

### 1.1 Ir a Settings → Domains

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Domains**

### 1.2 Agregar el Dominio

1. En el campo de texto, escribe: `vistral.dev.io`
2. Click en **"Add"** o **"Add Domain"**

### 1.3 Verificar la Configuración

Vercel te mostrará los registros DNS que necesitas configurar. Deberías ver algo como:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**O si Vercel usa registros CNAME:**

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Anota estos valores** - los necesitarás en GoDaddy.

## 📋 Paso 2: Configurar DNS en GoDaddy

### 2.1 Acceder a GoDaddy DNS

1. Ve a [godaddy.com](https://godaddy.com)
2. Inicia sesión
3. Ve a **My Products** → **Domains**
4. Click en `vistral.dev.io`
5. Click en **"DNS"** o **"Manage DNS"**

### 2.2 Configurar Registros DNS

Necesitas agregar/modificar estos registros:

#### Opción A: Si Vercel te da registros A

1. **Busca el registro A existente** para `@` (root domain)
2. **Modifica** el valor a: `76.76.21.21` (o el IP que Vercel te dio)
3. **Agrega un registro CNAME** para `www`:
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com` (o el que Vercel te dio)
   - **TTL**: 600 (o el que prefieras)

#### Opción B: Si Vercel te da registros CNAME

1. **Modifica el registro A** de `@` a un registro CNAME:
   - **Type**: CNAME
   - **Name**: `@` (o deja en blanco para root)
   - **Value**: `cname.vercel-dns.com` (o el que Vercel te dio)
   - **TTL**: 600

2. **Agrega registro CNAME** para `www`:
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 600

### 2.3 Guardar Cambios

1. Click en **"Save"** o **"Add Record"**
2. Los cambios pueden tardar unos minutos en propagarse

## ⏳ Paso 3: Esperar Propagación DNS

La propagación DNS puede tardar:
- **Mínimo**: 5-10 minutos
- **Típico**: 30 minutos - 2 horas
- **Máximo**: 24-48 horas (raro)

### Verificar Propagación

Puedes verificar si los DNS están propagados:

```bash
# Verificar registro A
dig vistral.dev.io

# Verificar registro CNAME
dig www.vistral.dev.io
```

O usa herramientas online:
- [whatsmydns.net](https://www.whatsmydns.net)
- [dnschecker.org](https://dnschecker.org)

## ✅ Paso 4: Verificar en Vercel

1. Ve a Vercel Dashboard → **Settings** → **Domains**
2. Deberías ver `vistral.dev.io` con estado:
   - ⏳ **Pending** - Esperando propagación DNS
   - ✅ **Valid** - Dominio configurado correctamente
   - ❌ **Invalid** - Hay un problema con la configuración

### Si está en "Pending"

Espera unos minutos y recarga la página. Vercel verificará automáticamente.

### Si está en "Invalid"

1. Verifica que los registros DNS están correctos en GoDaddy
2. Espera más tiempo para la propagación
3. Verifica que no hay errores de tipado

## 🔧 Paso 5: Actualizar Variables de Entorno (Opcional)

Una vez que el dominio esté funcionando, puedes actualizar:

### En Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega o actualiza:
   ```
   Key: NEXT_PUBLIC_APP_URL
   Value: https://vistral.dev.io
   Environment: Production, Preview, Development
   ```

Esto ayudará con:
- Configuración automática del webhook de Airtable
- URLs absolutas en la aplicación
- Redirecciones correctas

## 🧪 Paso 6: Probar el Dominio

Una vez que Vercel muestre el dominio como "Valid":

1. Abre `https://vistral.dev.io` en tu navegador
2. Deberías ver tu aplicación funcionando
3. Verifica que HTTPS funciona (Vercel lo configura automáticamente)

## 🔄 Paso 7: Configurar Webhook con el Nuevo Dominio

Después de que el dominio esté funcionando:

```bash
# El webhook ahora usará el dominio personalizado
NEXT_PUBLIC_APP_URL=https://vistral.dev.io npm run setup:airtable-webhook
```

O manualmente en Airtable:
- URL: `https://vistral.dev.io/api/webhooks/airtable`

## 🐛 Troubleshooting

### El dominio no se verifica

1. **Verifica los registros DNS** en GoDaddy
2. **Espera más tiempo** (puede tardar hasta 24 horas)
3. **Verifica que no hay errores** en los valores de DNS
4. **Elimina y vuelve a agregar** el dominio en Vercel

### El dominio carga pero muestra error

1. **Verifica que el deploy está activo** en Vercel
2. **Revisa los logs** en Vercel Dashboard
3. **Verifica las variables de entorno** están configuradas

### HTTPS no funciona

Vercel configura HTTPS automáticamente. Si no funciona:
1. Espera unos minutos más
2. Verifica que el dominio está verificado en Vercel
3. Vercel emitirá el certificado SSL automáticamente

## ✅ Checklist Final

- [ ] Dominio agregado en Vercel
- [ ] Registros DNS configurados en GoDaddy
- [ ] Esperado propagación DNS (30 min - 2 horas)
- [ ] Dominio verificado en Vercel (estado "Valid")
- [ ] `https://vistral.dev.io` funciona correctamente
- [ ] HTTPS funciona automáticamente
- [ ] Variables de entorno actualizadas (opcional)
- [ ] Webhook de Airtable actualizado con nuevo dominio

## 🎉 ¡Listo!

Una vez completado, tu aplicación estará disponible en:
- **Producción**: `https://vistral.dev.io`
- **Preview deployments**: `https://[branch-name]-vistral-dev-io.vercel.app`

