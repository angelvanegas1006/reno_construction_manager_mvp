# 🔧 Habilitar Ambiente Preview en Vercel

## ⚠️ Problema

No puedes configurar un dominio para Preview porque el ambiente Preview no está habilitado o configurado.

## ✅ Solución: Configurar Preview Deployments

### Paso 1: Verificar Configuración de Git/Branches

1. Ve a Vercel Dashboard → Tu proyecto → **Settings** → **Git**

2. Verifica estas configuraciones:

   **Production Branch:**
   - Debe estar configurada como `main` (o tu branch de producción)
   
   **Preview Deployments:**
   - Debe estar **habilitado** (Enabled)
   - Generalmente está habilitado por defecto

### Paso 2: Habilitar Preview Deployments

Si Preview Deployments no está habilitado:

1. Ve a **Settings** → **Git**
2. Busca la sección **"Preview Deployments"**
3. Asegúrate de que está **Enabled** ✅
4. Opcionalmente, puedes configurar:
   - **Automatic Preview Deployments**: Enabled
   - **Pull Request Comments**: Enabled (opcional, para comentar en PRs)

### Paso 3: Crear una Branch de Prueba

Para que Vercel reconozca el ambiente Preview, necesitas tener al menos una branch que no sea `main`:

```bash
# Crear una branch de prueba
git checkout -b preview-test

# Hacer un pequeño cambio (opcional)
echo "# Preview Test" >> README.md

# Push la branch
git add .
git commit -m "Test preview deployment"
git push origin preview-test
```

Esto creará automáticamente un Preview Deployment en Vercel.

### Paso 4: Verificar que Preview Funciona

1. Ve a Vercel Dashboard → **Deployments**
2. Deberías ver un deployment con:
   - Branch: `preview-test` (o la branch que creaste)
   - Environment: **Preview** (debería aparecer así)
   - URL: `preview-test-tu-proyecto.vercel.app`

Si ves esto, el ambiente Preview está funcionando.

### Paso 5: Ahora Configurar el Dominio para Preview

Una vez que confirmes que Preview funciona:

1. Ve a **Settings** → **Domains**
2. Agrega `dev.vistral.io`
3. Ahora deberías poder seleccionar:
   - ☑ Production
   - ☑ **Preview** ← Esta opción debería estar disponible ahora
   - ☐ Development

4. **Marca solo Preview** (o Production + Preview si quieres ambos)
5. Click **Save**

## 🔍 Verificar Configuración Actual

### En Vercel Dashboard:

1. **Settings** → **Git**:
   - ✅ Production Branch: `main`
   - ✅ Preview Deployments: Enabled

2. **Deployments**:
   - Deberías ver deployments con ambiente "Preview"

3. **Settings** → **Domains**:
   - Deberías poder agregar dominios y seleccionar "Preview"

## 🐛 Si Aún No Funciona

### Opción 1: Verificar Permisos

Asegúrate de que tienes permisos de administrador en el proyecto de Vercel.

### Opción 2: Usar Vercel CLI

Puedes verificar la configuración desde la CLI:

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Ver configuración del proyecto
vercel project ls
```

### Opción 3: Contactar Soporte

Si nada funciona, puede ser un problema de la cuenta o del proyecto. Contacta soporte de Vercel.

## 📋 Checklist para Habilitar Preview

- [ ] Ve a Settings → Git
- [ ] Verifica que Preview Deployments está Enabled
- [ ] Crea una branch de prueba (no `main`)
- [ ] Haz push de la branch
- [ ] Verifica que aparece un Preview Deployment en Vercel
- [ ] Ve a Settings → Domains
- [ ] Intenta agregar `dev.vistral.io`
- [ ] Verifica que puedes seleccionar "Preview"

## 💡 Alternativa: Configurar Dominio para Production + Preview

Si no puedes configurar solo Preview, puedes:

1. Agregar `dev.vistral.io` marcando **Production + Preview**
2. Esto hará que `dev.vistral.io` muestre:
   - Production deployments cuando hay uno activo
   - Preview deployments cuando no hay producción activa
   - O el último deployment (según configuración de Vercel)

No es ideal, pero funciona si necesitas una solución rápida.

## 🎯 Configuración Recomendada Final

Una vez que Preview esté habilitado:

**Production:**
- `app.vistral.io` → Solo Production

**Preview:**
- `dev.vistral.io` → Solo Preview

**Workflow:**
- Desarrollo en branches → Deploy a Preview → Ver en `dev.vistral.io`
- Merge a `main` → Deploy a Production → Ver en `app.vistral.io`


