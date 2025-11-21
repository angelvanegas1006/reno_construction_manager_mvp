# ✅ Listo para Probar Localmente

## ✅ Configuración Completada

- ✅ Dependencias instaladas
- ✅ `.env.local` configurado con credenciales de Manu
- ✅ Proyecto Supabase: `fxmobdtjazijugpzkadn`

---

## 🚀 Iniciar Servidor

```bash
npm run dev
```

Deberías ver:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
```

---

## 🧪 Probar Funcionalidades

### **1. Test de Conexión a Supabase**
```
http://localhost:3000/app/test-supabase
```
- Debería mostrar información de conexión
- Verifica que se conecta al proyecto de Manu

### **2. Login**
```
http://localhost:3000/app/login
```
- Debería mostrar formulario de login
- Puedes probar autenticación

### **3. Checklist**
```
http://localhost:3000/reno/construction-manager/property/[PROPERTY_ID]/checklist
```

**Para obtener un property ID:**
- Ve a `/reno/construction-manager`
- Click en una propiedad del Kanban
- Copia el ID de la URL

---

## ⚠️ Verificar Migraciones

Manu probablemente ya ejecutó las migraciones, pero verifica:

1. Ve a Supabase Dashboard: https://fxmobdtjazijugpzkadn.supabase.co
2. Table Editor → Verifica que existen:
   - ✅ `property_inspections`
   - ✅ `inspection_zones`
   - ✅ `inspection_elements`

**Si NO existen**, ejecuta:
- `supabase/migrations/001_checklist_migrations.sql` en SQL Editor

---

## 🐛 Troubleshooting

### **Error: "Missing Supabase environment variables"**
```bash
# Verificar que .env.local tiene las variables
cat .env.local | grep SUPABASE
```

### **Error: "Cannot connect to Supabase"**
- Verifica que las credenciales son correctas
- Verifica tu conexión a internet
- Verifica que el proyecto Supabase está activo

### **Error: "Table does not exist"**
- Ejecuta las migraciones SQL
- Ver `supabase/migrations/001_checklist_migrations.sql`

---

## ✅ Checklist Final

- [ ] `.env.local` configurado ✅
- [ ] `npm run dev` iniciado
- [ ] Test Supabase funciona (`/app/test-supabase`)
- [ ] Login funciona (`/app/login`)
- [ ] Checklist carga (`/reno/construction-manager/property/[id]/checklist`)

---

¡Listo para probar! 🚀

