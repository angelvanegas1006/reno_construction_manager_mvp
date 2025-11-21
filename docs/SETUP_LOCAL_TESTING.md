# 🚀 Setup para Testing Local - Paso a Paso

## ✅ Paso 1: Dependencias Instaladas

```bash
✅ npm install completado
```

---

## ✅ Paso 2: Configurar Variables de Entorno

### **Crear `.env.local`**

```bash
# Desde la raíz del proyecto
cp .env.example .env.local
```

### **Editar `.env.local` con tus credenciales de Supabase:**

```env
# Development Environment
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development

# Supabase Configuration
# Obtén estas keys de: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Service Role Key (opcional, solo para server-side)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_EVENT_BUS_LOGGING=true
```

**¿No tienes proyecto Supabase?**
1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto (free tier está bien)
3. Espera ~2 minutos a que se cree
4. Ve a Settings → API → Copia las keys

---

## ✅ Paso 3: Ejecutar Migraciones SQL

### **Opción A: Script Consolidado (Recomendado)**

1. Ve a Supabase Dashboard → SQL Editor
2. Abre el archivo: `supabase/migrations/001_checklist_migrations.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Click en "Run" o presiona Cmd+Enter

### **Opción B: Migraciones Individuales**

Si prefieres ejecutar una por una, ve a `SUPABASE_MIGRATION_CHECKLIST.md` y ejecuta cada migración.

---

## ✅ Paso 4: Verificar Tablas Creadas

1. Ve a Supabase Dashboard → Table Editor
2. Verifica que estas tablas existen:
   - ✅ `property_inspections`
   - ✅ `inspection_zones`
   - ✅ `inspection_elements`

---

## ✅ Paso 5: Crear Bucket de Storage (Opcional)

Si quieres probar subida de archivos:

1. Ve a Supabase Dashboard → Storage
2. Click en "Create bucket"
3. Nombre: `inspection-images`
4. Public: **No** (privado)
5. Click "Create"

---

## ✅ Paso 6: Iniciar Servidor

```bash
npm run dev
```

Deberías ver:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
```

---

## ✅ Paso 7: Probar Funcionalidades

### **1. Test de Conexión a Supabase**
```
http://localhost:3000/app/test-supabase
```
- Debería mostrar información de conexión

### **2. Login**
```
http://localhost:3000/app/login
```
- Debería mostrar formulario de login

### **3. Checklist (necesitas un property ID)**
```
http://localhost:3000/reno/construction-manager/property/[PROPERTY_ID]/checklist
```

**Para obtener un property ID:**
- Ve a `/reno/construction-manager`
- Click en una propiedad
- Copia el ID de la URL

---

## 🐛 Si Algo Falla

### **Error: "Missing Supabase environment variables"**
```bash
# Verificar que .env.local existe y tiene las variables
cat .env.local | grep SUPABASE
```

### **Error: "Table does not exist"**
- Verifica que ejecutaste las migraciones SQL
- Verifica en Supabase Dashboard → Table Editor

### **Error: "Cannot find module '@supabase/ssr'"**
```bash
npm install @supabase/ssr @supabase/supabase-js
```

### **El servidor no inicia**
```bash
# Verificar que no hay errores de sintaxis
npm run build
```

---

## 📝 Checklist Final

- [ ] Dependencias instaladas (`npm install`)
- [ ] `.env.local` creado y configurado
- [ ] Migraciones SQL ejecutadas en Supabase
- [ ] Tablas verificadas en Supabase Dashboard
- [ ] Bucket `inspection-images` creado (opcional)
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Test de Supabase funciona (`/app/test-supabase`)
- [ ] Login funciona (`/app/login`)

---

## 🎯 Próximos Pasos

Una vez que todo funciona:
1. Probar crear una inspección
2. Probar guardar secciones del checklist
3. Probar subir imágenes/videos
4. Verificar que se guarda en Supabase

---

¿Listo para empezar? Te guío paso a paso.

