# 🔗 Usar el Mismo Supabase de Manu

## ✅ Correcto: Usar el Proyecto Existente

Tienes razón - Manu ya tiene todo conectado y funcionando. Usemos el mismo proyecto de Supabase.

---

## 📋 Opciones para Obtener las Credenciales

### **Opción 1: Pedirle las Credenciales a Manu** (Más Rápido)

Pídele a Manu:
1. **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
2. **anon key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Luego edita `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://proyecto-de-manu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-de-manu
```

### **Opción 2: Acceso Compartido al Proyecto**

Si Manu te da acceso al proyecto Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión
3. Selecciona el proyecto de Manu
4. Ve a Settings → API
5. Copia las keys

### **Opción 3: Verificar si Manu las Compartió**

Revisa si Manu dejó las credenciales en algún lugar:
- Documentación del proyecto
- Variables de entorno compartidas
- Archivo `.env.example` con valores de ejemplo

---

## ✅ Una Vez que Tengas las Credenciales

### **1. Editar `.env.local`**

```bash
# Editar el archivo
code .env.local
# o
nano .env.local
```

Completa:
```env
NEXT_PUBLIC_SUPABASE_URL=https://proyecto-de-manu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-de-manu
```

### **2. Verificar Migraciones**

Manu probablemente ya ejecutó las migraciones SQL. Verifica en Supabase Dashboard:
- Table Editor → Ver si existen las tablas:
  - `property_inspections`
  - `inspection_zones`
  - `inspection_elements`

Si **NO existen**, ejecuta:
- `supabase/migrations/001_checklist_migrations.sql`

### **3. Iniciar Servidor**

```bash
npm run dev
```

### **4. Probar**

- Test Supabase: http://localhost:3000/app/test-supabase
- Login: http://localhost:3000/app/login
- Checklist: http://localhost:3000/reno/construction-manager/property/[id]/checklist

---

## 🎯 Ventajas de Usar el Mismo Proyecto

- ✅ **Datos compartidos**: Verás los mismos datos que Manu
- ✅ **Migraciones ya ejecutadas**: Probablemente ya están las tablas
- ✅ **Testing real**: Probarás con datos reales
- ✅ **Sin duplicación**: No necesitas crear proyecto nuevo

---

## ⚠️ Importante

- **No modifiques datos de producción** sin confirmar con Manu
- Si es proyecto de desarrollo, está bien probar
- Si es proyecto compartido, coordina cambios

---

¿Tienes acceso al proyecto de Supabase de Manu o necesitas pedirle las credenciales?

