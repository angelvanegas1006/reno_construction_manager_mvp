# 🌐 Configurar Subdominios por Ambiente en Vercel

## 📋 Entendiendo los Ambientes de Vercel

Vercel tiene 3 ambientes:

1. **Production** - Deployments desde la branch `main` (o la que configures)
2. **Preview** - Deployments desde otras branches o PRs
3. **Development** - Solo local con `vercel dev`

## 🎯 Opciones para Configurar Subdominios

### Opción 1: Un Solo Subdominio para Production (Recomendado)

**Configuración:**
- `app.vistral.io` → Solo apunta a **Production** deployments
- Los **Preview** deployments usan URLs automáticas: `[branch-name]-tu-proyecto.vercel.app`

**Ventajas:**
- ✅ Simple y directo
- ✅ El dominio principal siempre muestra producción
- ✅ Los previews tienen URLs únicas por branch

**Cómo configurar:**
1. En Vercel → Settings → Domains → Agrega `app.vistral.io`
2. Por defecto, solo apunta a Production
3. Los previews seguirán usando URLs de Vercel

### Opción 2: Subdominios Separados por Ambiente

**Configuración:**
- `app.vistral.io` → Production (branch `main`)
- `dev.vistral.io` → Preview deployments (otras branches)
- `staging.vistral.io` → Opcional, para una branch específica

**Ventajas:**
- ✅ Separación clara entre ambientes
- ✅ URLs amigables para previews
- ✅ Puedes probar en `dev.vistral.io` antes de mergear

**Cómo configurar:**

#### Para Production (`app.vistral.io`):
1. Vercel → Settings → Domains → Agrega `app.vistral.io`
2. Por defecto apunta a Production
3. Configura DNS en GoDaddy:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

#### Para Preview (`dev.vistral.io`):
1. Vercel → Settings → Domains → Agrega `dev.vistral.io`
2. **IMPORTANTE**: En la configuración del dominio, selecciona:
   - ✅ **Preview** (marca esta casilla)
   - ❌ **Production** (desmarca si solo quieres preview)
3. Configura DNS en GoDaddy:
   ```
   Type: CNAME
   Name: dev
   Value: cname.vercel-dns.com
   ```

## 🔧 Configuración Detallada por Ambiente

### Para Preview Deployments

Si quieres que `dev.vistral.io` apunte a preview deployments:

1. **En Vercel:**
   - Settings → Domains → Agrega `dev.vistral.io`
   - En la configuración del dominio, verás opciones:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - **Marca solo Preview** (o Production + Preview si quieres ambos)

2. **En GoDaddy:**
   ```
   Type: CNAME
   Name: dev
   Value: cname.vercel-dns.com
   ```

3. **Resultado:**
   - `dev.vistral.io` mostrará el último preview deployment
   - Cada vez que hagas push a una branch que no sea `main`, se actualizará `dev.vistral.io`

### Para Production

1. **En Vercel:**
   - Settings → Domains → Agrega `app.vistral.io`
   - Marca solo **Production** (o Production + Preview si quieres)

2. **En GoDaddy:**
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

3. **Resultado:**
   - `app.vistral.io` solo se actualiza cuando haces push a `main`

## 📊 Ejemplo de Configuración Completa

### Escenario: Desarrollo y Producción Separados

**Production:**
- Subdominio: `app.vistral.io`
- Branch: `main`
- DNS: `app` → `cname.vercel-dns.com`
- Ambiente: Solo Production

**Preview/Development:**
- Subdominio: `dev.vistral.io`
- Branches: Todas excepto `main`
- DNS: `dev` → `cname.vercel-dns.com`
- Ambiente: Solo Preview

**Workflow:**
```
1. Desarrollo en feature branch
   ↓
2. Push a feature branch → Deploy a Preview
   ↓
3. Verificar en dev.vistral.io
   ↓
4. Merge a main → Deploy a Production
   ↓
5. Verificar en app.vistral.io
```

## ⚙️ Configuración en Vercel Dashboard

Cuando agregas un dominio en Vercel, verás estas opciones:

```
Domain: dev.vistral.io

Assign to:
☑ Production
☑ Preview
☐ Development
```

- **Production**: Solo deployments desde `main`
- **Preview**: Deployments desde otras branches
- **Development**: Solo para `vercel dev` local (raro usar dominio)

## 🎯 Recomendación

Para tu caso, te recomiendo:

### Opción A: Simple (Recomendado para empezar)
- `app.vistral.io` → Production solamente
- Previews usan URLs automáticas de Vercel

### Opción B: Separado (Si necesitas probar antes de producción)
- `app.vistral.io` → Production
- `dev.vistral.io` → Preview
- Así puedes probar en `dev.vistral.io` antes de mergear a `main`

## 🔄 Actualizar Variables de Entorno por Ambiente

### Para Production (`app.vistral.io`):

En Vercel → Settings → Environment Variables:
```
Key: NEXT_PUBLIC_APP_URL
Value: https://app.vistral.io
Environment: ✅ Production only
```

### Para Preview (`dev.vistral.io`):

```
Key: NEXT_PUBLIC_APP_URL
Value: https://dev.vistral.io
Environment: ✅ Preview only
```

O si quieres que use el dominio automático de Vercel en preview:
```
Key: NEXT_PUBLIC_APP_URL
Value: https://app.vistral.io
Environment: ✅ Production
(No configures para Preview, usará VERCEL_URL automáticamente)
```

## ✅ Checklist

### Para Production:
- [ ] `app.vistral.io` agregado en Vercel
- [ ] Configurado para Production solamente
- [ ] DNS configurado en GoDaddy (`app` → CNAME)
- [ ] Variables de entorno configuradas para Production

### Para Preview:
- [ ] `dev.vistral.io` agregado en Vercel
- [ ] Configurado para Preview solamente
- [ ] DNS configurado en GoDaddy (`dev` → CNAME)
- [ ] Variables de entorno configuradas para Preview (opcional)

## 💡 Respuesta Directa a tu Pregunta

**¿Debería ser "dev" para preview?**

Sí, es una buena práctica:
- `app.vistral.io` → Production (main branch)
- `dev.vistral.io` → Preview (otras branches)

Así puedes:
- Desarrollar en feature branches
- Ver los cambios en `dev.vistral.io`
- Cuando esté listo, mergear a `main` y se actualiza `app.vistral.io`









