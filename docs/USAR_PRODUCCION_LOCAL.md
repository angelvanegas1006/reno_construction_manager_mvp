# 🔄 Usar Producción en Localhost (Temporal)

Si necesitas hacer login con usuarios de producción (`manuel.gomez@prophero.com`) desde localhost:

## ⚠️ Importante

Esto es solo para **testing temporal**. En desarrollo normal, deberías usar el proyecto de desarrollo.

---

## ✅ Solución: Cambiar .env.local Temporalmente

### **Paso 1: Hacer Backup del .env.local Actual**

```bash
cp .env.local .env.local.dev.backup
```

### **Paso 2: Actualizar .env.local con Credenciales de Producción**

Edita `.env.local` y cambia:

```env
# Development Environment (TEMPORAL - usando producción)
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# Supabase Configuration - PRODUCCIÓN (temporal)
NEXT_PUBLIC_SUPABASE_URL=https://fxmobdtjazijugpzkadn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bW9iZHRqYXppanVncHprYWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDM2MzMsImV4cCI6MjA2MjE3OTYzM30.H2WZTVxTRvd_LRI4r0QPSWsQHzaWgEuKw10NAXzuZ1c
SUPABASE_SERVICE_ROLE_KEY=[pide a Manu el service_role key de producción]

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=true
```

### **Paso 3: Reiniciar el Servidor**

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

### **Paso 4: Probar Login**

Ahora puedes hacer login con:
- Email: `manuel.gomez@prophero.com`
- Password: [la contraseña de Manu]

---

## 🔄 Volver a Desarrollo

Cuando termines de probar:

```bash
# Restaurar configuración de desarrollo
cp .env.local.dev.backup .env.local

# Reiniciar servidor
npm run dev
```

---

## 🎯 Alternativa: Crear Usuario en Desarrollo

Si prefieres mantener desarrollo separado:

1. Crea el usuario `manuel.gomez@prophero.com` en el proyecto de desarrollo
2. Usa la misma contraseña
3. Asigna el rol correspondiente

---

## ⚠️ Advertencias

- **No commitees** `.env.local` con credenciales de producción
- **No uses** producción para desarrollo activo
- **Restaura** la configuración de desarrollo después de probar

