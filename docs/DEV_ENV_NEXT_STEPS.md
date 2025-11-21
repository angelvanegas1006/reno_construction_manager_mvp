# 🚀 Próximos Pasos: Entorno de Desarrollo

## ✅ Completado

- [x] Proyecto Supabase de desarrollo creado (`vistral-dev`)
- [x] Credenciales guardadas en `.env.local.dev.backup`
- [x] `.env.local` restaurado con credenciales de desarrollo

---

## 📋 Paso Actual: Ejecutar Migraciones SQL

### **Opción 1: Desde Supabase Dashboard (Recomendado)**

1. **Abre el proyecto de desarrollo:**
   - Ve a: https://app.supabase.com
   - Selecciona el proyecto: `vistral-dev` (o busca por URL: `kqqobbxjyrdputngvxrf`)

2. **Abre el SQL Editor:**
   - En el menú lateral izquierdo, click en **"SQL Editor"**
   - Click en **"New query"**

3. **Ejecuta las migraciones:**
   - Abre el archivo: `supabase/migrations/001_checklist_migrations.sql`
   - Copia **TODO** el contenido
   - Pégalo en el SQL Editor
   - Click en **"Run"** o presiona `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

4. **Verifica que se ejecutó correctamente:**
   - Deberías ver un mensaje: "Success. No rows returned"
   - O un mensaje indicando que las tablas/funciones fueron creadas

5. **Ejecuta la migración de user_roles (opcional pero recomendado):**
   - Abre: `supabase/migrations/002_user_roles.sql`
   - Copia y ejecuta en SQL Editor

---

## 📋 Paso Siguiente: Verificar Tablas Creadas

1. **Ve a Table Editor:**
   - En el menú lateral, click en **"Table Editor"**

2. **Verifica que estas tablas existen:**
   - ✅ `property_inspections`
   - ✅ `inspection_zones`
   - ✅ `inspection_elements`
   - ✅ `event_store` (si ejecutaste Event Bus migrations)
   - ✅ `user_roles` (si ejecutaste la migración 002)

---

## 📋 Paso Final: Crear Usuario de Prueba

### **Opción A: Desde Supabase Dashboard**

1. **Ve a Authentication:**
   - En el menú lateral, click en **"Authentication"**
   - Click en **"Users"**

2. **Crear nuevo usuario:**
   - Click en **"Add user"** → **"Create new user"**
   - **Email**: `dev@vistral.com` (o el que prefieras)
   - **Password**: Genera una segura
   - **Auto Confirm User**: ✅ Marca esta casilla
   - Click en **"Create user"**

3. **Asignar rol (opcional):**
   - Ve a **"Table Editor"** → `user_roles`
   - Click en **"Insert row"**
   - **user_id**: Copia el UUID del usuario que acabas de crear
   - **role**: Selecciona `partner` o `foreman` o `admin`
   - Click en **"Save"**

### **Opción B: Desde la App (Registro)**

1. Ve a: http://localhost:3000/login
2. Click en "Crear cuenta" (si existe)
3. Completa el formulario
4. Verifica el email (o auto-confirma desde Supabase)

---

## 🧪 Probar el Entorno de Desarrollo

### **1. Reiniciar el servidor:**

```bash
# Detén el servidor actual (Ctrl+C)
# Luego reinicia:
npm run dev
```

### **2. Verificar que está usando desarrollo:**

Abre la consola del navegador (F12) y deberías ver:
```
🔧 Environment Configuration:
   Environment: development
   Supabase Project: vistral-dev
   Supabase URL: ✅ Set
```

### **3. Probar login:**

1. Ve a: http://localhost:3000/login
2. Inicia sesión con el usuario que creaste
3. Verifica que puedas navegar por la app

---

## 📊 Checklist de Desarrollo

- [ ] Migraciones SQL ejecutadas en `vistral-dev`
- [ ] Tablas verificadas en Table Editor
- [ ] Usuario de prueba creado
- [ ] Servidor corriendo con `.env.local` de desarrollo
- [ ] Login funciona correctamente
- [ ] Puedes crear propiedades en desarrollo
- [ ] Checklist funciona en desarrollo

---

## 🔄 Si Necesitas Volver a Producción

```bash
# Restaurar producción temporalmente
cp .env.local.dev.backup .env.local.prod.backup
# Edita .env.local con credenciales de producción
```

---

## 🆘 Problemas Comunes

**"Missing Supabase environment variables"**
→ Verifica que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**"Table does not exist"**
→ Ejecuta las migraciones SQL en Supabase Dashboard

**"Invalid login credentials"**
→ Verifica que el usuario existe en el proyecto correcto (`vistral-dev`)

---

## 📚 Documentación Relacionada

- [Guía Completa de Entornos](./environment-setup.md)
- [Paso a Paso Supabase](./PASO_A_PASO_SUPABASE.md)
- [Quick Start Testing](./QUICK_START_TESTING.md)

