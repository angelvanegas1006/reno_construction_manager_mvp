# ⚡ Quick Start: Testing Local

## 🎯 Pasos Rápidos (5 minutos)

### **1. ✅ Dependencias Instaladas**
```bash
✅ Ya hecho: npm install completado
```

### **2. Configurar Supabase**

**A. Crear proyecto Supabase (si no tienes):**
1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto → Nombre: `vistral-dev`
3. Espera ~2 minutos

**B. Copiar credenciales:**
1. Ve a Settings → API
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**C. Editar `.env.local`:**
```bash
# Abre .env.local y pega tus credenciales
nano .env.local
# o
code .env.local
```

### **3. Ejecutar Migraciones SQL**

1. Ve a Supabase Dashboard → **SQL Editor**
2. Abre: `supabase/migrations/001_checklist_migrations.sql`
3. Copia TODO el contenido
4. Pégalo en SQL Editor
5. Click **"Run"** o Cmd+Enter

### **4. Iniciar Servidor**

```bash
npm run dev
```

### **5. Probar**

Abre en el navegador:
- **Test Supabase**: http://localhost:3000/app/test-supabase
- **Login**: http://localhost:3000/app/login

---

## ✅ Checklist

- [ ] Proyecto Supabase creado
- [ ] `.env.local` configurado con credenciales
- [ ] Migraciones SQL ejecutadas
- [ ] `npm run dev` corriendo
- [ ] Test de Supabase funciona

---

## 🆘 Si Algo Falla

**"Missing Supabase environment variables"**
→ Verifica que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**"Table does not exist"**
→ Ejecuta las migraciones SQL en Supabase

**Servidor no inicia**
→ Verifica que no hay errores: `npm run build`

---

¿Tienes proyecto Supabase ya creado o necesitas crearlo?

