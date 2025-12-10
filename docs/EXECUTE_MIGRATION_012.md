# 🚀 Ejecutar Migración 012: Google Calendar Tokens

## 📋 Paso a Paso

### **Paso 1: Abrir Supabase Dashboard**
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral)
4. Click en **"New query"**

---

### **Paso 2: Copiar el contenido de la migración**

**Opción A: Desde Terminal**
```bash
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"
cat supabase/migrations/012_google_calendar_tokens.sql
# Copia TODO el contenido que aparece
```

**Opción B: Desde VS Code**
1. Abre el archivo: `supabase/migrations/012_google_calendar_tokens.sql`
2. Selecciona TODO (`Cmd+A` / `Ctrl+A`)
3. Copia (`Cmd+C` / `Ctrl+C`)

---

### **Paso 3: Pegar en Supabase SQL Editor**
1. Vuelve a Supabase Dashboard
2. Click en el área de texto del SQL Editor
3. Pega el contenido (`Cmd+V` / `Ctrl+V`)

---

### **Paso 4: Ejecutar la migración**
1. Revisa que el código esté completo
2. Presiona `Cmd + Enter` (Mac) o `Ctrl + Enter` (Windows/Linux)
3. O click en el botón **"Run"**

---

### **Paso 5: Verificar que funcionó**

**✅ Si todo salió bien:**
- Mensaje verde: "Success. No rows returned"
- O mensaje: "Success. X rows affected"

**❌ Si hay errores:**
- Algunos errores son normales si las tablas ya existen
- Si ves errores críticos, comparte el mensaje

---

### **Paso 6: Verificar tablas creadas**

Ejecuta esta query en Supabase SQL Editor para verificar:

```sql
-- Verificar tabla google_calendar_tokens
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'google_calendar_tokens'
ORDER BY ordinal_position;

-- Verificar tabla google_calendar_events
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'google_calendar_events'
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('google_calendar_tokens', 'google_calendar_events');
```

Deberías ver:
- ✅ Tabla `google_calendar_tokens` con todas sus columnas
- ✅ Tabla `google_calendar_events` con todas sus columnas
- ✅ Índices creados correctamente

---

## ✅ Listo!

Una vez ejecutada la migración, continúa con la configuración de variables de entorno.

