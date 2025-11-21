# 🧪 Guía de Testing Local - Cambios de Manu

## 📋 Checklist de Setup

### ✅ Paso 1: Instalar Dependencias

```bash
npm install
```

Esto instalará `@supabase/ssr` y `@supabase/supabase-js` que Manu agregó.

---

### ✅ Paso 2: Configurar Variables de Entorno

#### **Opción A: Si ya tienes proyecto Supabase**

1. Ve a tu proyecto Supabase Dashboard
2. Settings → API → Copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Crea/edita `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
NEXT_PUBLIC_APP_ENV=development
```

#### **Opción B: Si NO tienes proyecto Supabase aún**

1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto (puede ser free tier)
3. Espera a que se cree (~2 minutos)
4. Copia las keys como en Opción A

---

### ✅ Paso 3: Ejecutar Migraciones SQL (CRÍTICO)

**⚠️ IMPORTANTE**: Sin estas migraciones, el código NO funcionará.

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta las migraciones de `SUPABASE_MIGRATION_CHECKLIST.md`:

#### **Migración 1: Actualizar enum de condición**

```sql
-- Eliminar constraint actual
ALTER TABLE inspection_elements 
DROP CONSTRAINT IF EXISTS inspection_elements_condition_check;

-- Crear nuevo enum con 4 estados
CREATE TYPE inspection_condition AS ENUM (
  'buen_estado',
  'necesita_reparacion',
  'necesita_reemplazo',
  'no_aplica'
);

-- Actualizar la columna condition
ALTER TABLE inspection_elements 
ALTER COLUMN condition TYPE inspection_condition 
USING CASE 
  WHEN condition = 'Buen estado' THEN 'buen_estado'::inspection_condition
  WHEN condition = 'Mal estado' THEN 'necesita_reparacion'::inspection_condition
  WHEN condition = 'No aplica' THEN 'no_aplica'::inspection_condition
  ELSE 'buen_estado'::inspection_condition
END;
```

#### **Migración 2: Agregar inspection_type**

```sql
-- Agregar columna para distinguir initial vs final
ALTER TABLE property_inspections 
ADD COLUMN IF NOT EXISTS inspection_type TEXT CHECK (inspection_type IN ('initial', 'final'));

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_property_inspections_type 
ON property_inspections(property_id, inspection_type);
```

#### **Migración 3: Actualizar zone_type enum**

```sql
-- Crear nuevo enum con todas las zonas
CREATE TYPE inspection_zone_type AS ENUM (
  'entrada',
  'distribucion',
  'dormitorio',
  'salon',
  'bano',
  'cocina',
  'exterior',
  'entorno'
);

-- Actualizar la columna zone_type
ALTER TABLE inspection_zones 
ALTER COLUMN zone_type TYPE inspection_zone_type 
USING zone_type::inspection_zone_type;
```

#### **Migración 4: Agregar video_urls**

```sql
-- Agregar columna para URLs de videos
ALTER TABLE inspection_elements 
ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';
```

---

### ✅ Paso 4: Verificar Tablas Existentes

Asegúrate de que estas tablas existen en Supabase:

- `property_inspections`
- `inspection_zones`
- `inspection_elements`

Si no existen, Manu probablemente las creó en otra migración. Verifica en Supabase Dashboard → Table Editor.

---

### ✅ Paso 5: Iniciar Servidor de Desarrollo

```bash
npm run dev
```

---

### ✅ Paso 6: Probar Funcionalidades

#### **1. Probar Login**
- Ve a: `http://localhost:3000/app/login`
- Verifica que el formulario aparece

#### **2. Probar Test de Supabase**
- Ve a: `http://localhost:3000/app/test-supabase`
- Verifica que se conecta a Supabase

#### **3. Probar Checklist**
- Ve a: `http://localhost:3000/reno/construction-manager/property/[id]/checklist`
- Reemplaza `[id]` con un ID de propiedad existente
- Verifica que:
  - Se carga la página
  - Puedes cambiar de sección
  - Se guarda automáticamente (verificar en Supabase)

#### **4. Probar Subida de Archivos**
- En el checklist, intenta subir una imagen
- Verifica que aparece en Supabase Storage → `inspection-images`

---

## 🐛 Troubleshooting

### **Error: "Missing Supabase environment variables"**

**Solución:**
```bash
# Verificar que .env.local existe
cat .env.local

# Verificar que tiene las variables
grep SUPABASE .env.local
```

### **Error: "Table does not exist"**

**Solución:**
- Verifica que ejecutaste las migraciones SQL
- Verifica en Supabase Dashboard → Table Editor que las tablas existen

### **Error: "Cannot find module '@supabase/ssr'"**

**Solución:**
```bash
npm install @supabase/ssr @supabase/supabase-js
```

### **Error: "Type inspection_condition does not exist"**

**Solución:**
- Ejecuta la Migración 1 (crear enum)

### **El checklist no guarda**

**Solución:**
- Verifica que `inspection_type` existe en `property_inspections`
- Verifica que ejecutaste todas las migraciones
- Revisa la consola del navegador para errores

---

## 📝 Notas

- **Primera vez**: Puede tardar un poco en crear las tablas
- **Datos de prueba**: Puedes crear una propiedad de prueba desde la app
- **Storage**: Asegúrate de que el bucket `inspection-images` existe en Supabase Storage

---

## ✅ Checklist Final

- [ ] Dependencias instaladas (`npm install`)
- [ ] `.env.local` configurado con Supabase
- [ ] Migraciones SQL ejecutadas
- [ ] Tablas verificadas en Supabase
- [ ] Servidor corriendo (`npm run dev`)
- [ ] Login funciona
- [ ] Checklist carga
- [ ] Checklist guarda en Supabase
- [ ] Archivos se suben correctamente

---

¿Listo para empezar? Te guío paso a paso.

