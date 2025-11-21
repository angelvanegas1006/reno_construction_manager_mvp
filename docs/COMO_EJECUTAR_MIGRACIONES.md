# 🚀 Cómo Ejecutar Migraciones SQL en Supabase

## 📋 Paso a Paso (Con Imágenes Mentales)

### **Paso 1: Ya estás aquí ✅**
- Abriste Supabase Dashboard
- Fuiste a **SQL Editor**
- Click en **"New query"**

---

### **Paso 2: Abrir el archivo de migraciones**

**Opción A: Desde VS Code / Editor de texto**

1. Abre VS Code (o tu editor)
2. Navega a la carpeta del proyecto: `/Users/angelvanegas/Desktop/new project/vistral-mvp`
3. Abre el archivo: `supabase/migrations/001_checklist_migrations.sql`
4. Selecciona **TODO** el contenido (`Cmd+A` en Mac, `Ctrl+A` en Windows)
5. Copia (`Cmd+C` / `Ctrl+C`)

**Opción B: Desde Terminal**

```bash
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"
cat supabase/migrations/001_checklist_migrations.sql
# Copia todo el contenido que aparece
```

---

### **Paso 3: Pegar en Supabase SQL Editor**

1. **Vuelve a Supabase Dashboard** (donde tienes el "New query" abierto)
2. **Click en el área de texto grande** (donde dice "Write your query here" o similar)
3. **Pega** el contenido que copiaste (`Cmd+V` / `Ctrl+V`)
4. Deberías ver todo el código SQL pegado

---

### **Paso 4: Ejecutar la migración**

1. **Revisa que el código esté completo:**
   - Debería empezar con `-- ============================================`
   - Debería tener muchas líneas (más de 200)
   - Debería terminar con `-- ✅ Migraciones Completadas`

2. **Ejecuta la query:**
   - **Mac**: Presiona `Cmd + Enter`
   - **Windows/Linux**: Presiona `Ctrl + Enter`
   - O click en el botón **"Run"** (generalmente arriba a la derecha)

---

### **Paso 5: Verificar que funcionó**

**✅ Si todo salió bien, verás:**
- Mensaje verde: "Success. No rows returned"
- O mensaje: "Success. X rows affected"
- O simplemente sin errores

**❌ Si hay errores:**
- Verás mensajes en rojo
- Algunos errores son normales si las tablas ya existen (ej: "relation already exists")
- Si ves muchos errores, comparte el mensaje y te ayudo

---

### **Paso 6: Verificar tablas creadas**

1. En el menú lateral izquierdo de Supabase, click en **"Table Editor"**
2. Deberías ver estas tablas nuevas:
   - ✅ `property_inspections`
   - ✅ `inspection_zones`
   - ✅ `inspection_elements`
   - ✅ `event_store` (si se ejecutó correctamente)

---

## 🎯 Resumen Visual

```
Supabase Dashboard
├── SQL Editor (ya estás aquí ✅)
│   └── New query (abierto)
│       └── [Pega aquí el código SQL]
│           └── Cmd+Enter o Click "Run"
│
└── Table Editor (después de ejecutar)
    └── Verifica que las tablas existen
```

---

## 📝 Contenido del Archivo

El archivo `001_checklist_migrations.sql` contiene:
- Creación de tipos ENUM (`inspection_condition`, `inspection_zone_type`)
- Creación de tablas (`property_inspections`, `inspection_zones`, `inspection_elements`)
- Creación de índices para mejor rendimiento
- Funciones para Event Bus (`publish_event`, `store_event`)
- Tabla `event_store` para arquitectura basada en eventos

---

## 🆘 Problemas Comunes

**"relation already exists"**
→ Normal si ya ejecutaste las migraciones antes. Puedes ignorarlo.

**"permission denied"**
→ Verifica que estás en el proyecto correcto (`vistral-dev`)

**"syntax error"**
→ Verifica que copiaste TODO el contenido, sin cortar nada

**No veo las tablas después**
→ Refresca la página del Table Editor (F5)

---

## ✅ Checklist

- [ ] Archivo `001_checklist_migrations.sql` abierto
- [ ] Todo el contenido copiado
- [ ] Pegado en SQL Editor de Supabase
- [ ] Ejecutado con Cmd+Enter o botón "Run"
- [ ] Mensaje de éxito visible
- [ ] Tablas verificadas en Table Editor

---

¿Necesitas ayuda con algún paso específico?

