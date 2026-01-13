# 🔧 Solución de Problemas: Error "Oops, something went wrong" en Auth0

## 🔴 Error Común

Si ves el error "Oops, something went wrong" directamente en la página de Auth0 (no en tu aplicación), esto indica un problema de configuración en Auth0 Dashboard.

## ✅ Checklist de Verificación

### 1. Tipo de Aplicación (CRÍTICO)

**Paso a paso:**
1. Ve a [Auth0 Dashboard](https://manage.auth0.com/)
2. Ve a **Applications** → Tu aplicación (`HOplP6XwQqThwRRe1KHe7cW8QvDjsFhd`)
3. Ve a la pestaña **Settings**
4. Busca la sección **Application Type**
5. **DEBE decir:** `Single Page Application`
6. **NO debe decir:** `Regular Web Application` o `Native`

**Si está mal configurado:**
- Cambia a `Single Page Application`
- Haz clic en **Save Changes**
- Espera unos segundos y vuelve a intentar

### 2. URLs de Callback (Deben coincidir EXACTAMENTE)

En **Settings** → **Application URIs**, verifica:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback
https://dev.vistral.io/auth/callback
```
*(Agrega tu dominio de producción si lo tienes)*

**Allowed Logout URLs:**
```
http://localhost:3000
https://dev.vistral.io
```

**Allowed Web Origins:**
```
http://localhost:3000
https://dev.vistral.io
```

**⚠️ IMPORTANTE:**
- Las URLs deben coincidir EXACTAMENTE (incluyendo `http://` vs `https://`)
- No debe haber espacios extra
- No debe haber barras al final (`/`) innecesarias
- Cada URL debe estar en una línea separada o separadas por comas

### 3. Grant Types

En **Settings** → **Advanced Settings** → **Grant Types**, verifica:

**Deben estar habilitados:**
- ✅ **Authorization Code** (REQUERIDO)
- ✅ **Refresh Token** (Recomendado)

**NO deben estar habilitados como únicos:**
- ❌ Implicit (deprecated)
- ❌ Client Credentials (solo para Machine-to-Machine)

### 4. Verificar Logs de Auth0

1. Ve a **Monitoring** → **Logs**
2. Intenta iniciar sesión nuevamente
3. Busca el error más reciente
4. Revisa el mensaje de error específico

Los errores comunes en los logs incluyen:
- `invalid_redirect_uri`: La URL de callback no coincide
- `unauthorized_client`: El tipo de aplicación es incorrecto
- `invalid_client`: El client_id no es válido

## 🔍 Verificación Adicional

### Verificar Variables de Entorno

Asegúrate de que en `.env.local` tengas:

```env
NEXT_PUBLIC_AUTH0_DOMAIN=prophero-operators.eu.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=HOplP6XwQqThwRRe1KHe7cW8QvDjsFhd
NEXT_PUBLIC_AUTH0_NAMESPACE=https://vistral.io
```

### Reiniciar el Servidor de Desarrollo

Después de cambiar la configuración en Auth0 Dashboard:

```bash
# Detén el servidor (Ctrl+C)
# Reinicia
npm run dev
```

### Limpiar Cache del Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a **Application** → **Storage**
3. Haz clic en **Clear site data**
4. O simplemente usa **Incógnito/Privado** para probar

## 🆘 Si Nada Funciona

1. **Crea una nueva aplicación en Auth0:**
   - Ve a Applications → Create Application
   - Nombre: `Vistral MVP (SPA)`
   - Tipo: **Single Page Application**
   - Configura las URLs como se indica arriba
   - Copia el nuevo `Client ID`
   - Actualiza `.env.local` con el nuevo `Client ID`

2. **Verifica la versión del SDK:**
   ```bash
   npm list @auth0/auth0-react
   ```
   Debe ser `^2.10.0` o superior

3. **Revisa la consola del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña **Console**
   - Intenta iniciar sesión
   - Busca errores en rojo
   - Comparte los errores específicos

## 📞 Contacto

Si el problema persiste después de seguir estos pasos, comparte:
1. El tipo de aplicación configurado en Auth0
2. Los logs de Auth0 (Monitoring → Logs)
3. Los errores de la consola del navegador
4. Una captura de pantalla de la configuración de URLs en Auth0

