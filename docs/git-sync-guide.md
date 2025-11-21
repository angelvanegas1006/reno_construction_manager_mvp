# 🔄 Guía de Sincronización Git

## 📊 Estado Actual

**Cambios locales sin commitear:**
- ✅ Event Bus implementado (`packages/event-bus/`)
- ✅ Configuración de entornos (`lib/config/`)
- ✅ Documentación nueva (`docs/`)
- ✅ Actualizaciones en Supabase client y Event Bus

**Estado del repositorio:**
- Branch actual: `main`
- Sincronizado con: `origin/main`
- **Los cambios locales NO están en el remoto aún**

---

## 🔀 Sincronización con Fork de Manu

### **Escenario 1: Manu tiene un Fork**

Si Manu hizo un fork del repositorio, necesitas:

1. **Commitear tus cambios locales**
2. **Push a tu repositorio**
3. **Manu puede hacer pull desde tu repositorio** o crear un Pull Request

### **Escenario 2: Trabajando en el mismo repositorio**

Si ambos trabajan en el mismo repo, necesitas:

1. **Commitear tus cambios**
2. **Push a main** (o crear branch)
3. **Manu hace pull** para obtener los cambios

---

## 📝 Pasos para Sincronizar

### **Opción A: Commitear y Push Directo (si tienes permisos)**

```bash
# 1. Ver qué cambios hay
git status

# 2. Agregar todos los cambios
git add .

# 3. Commitear con mensaje descriptivo
git commit -m "feat: implement Event Bus and environment configuration

- Add @vistral/event-bus package with Supabase Realtime integration
- Add environment configuration (dev/staging/production)
- Add PostgreSQL migrations for event bus
- Update Supabase client to use environment config
- Add comprehensive documentation"

# 4. Push a remoto
git push origin main
```

### **Opción B: Crear Branch para Review**

```bash
# 1. Crear nueva branch
git checkout -b feature/event-bus-and-environments

# 2. Agregar cambios
git add .

# 3. Commitear
git commit -m "feat: implement Event Bus and environment configuration"

# 4. Push branch
git push origin feature/event-bus-and-environments

# 5. Crear Pull Request en GitHub
# (luego Manu puede revisar y hacer merge)
```

---

## 🔍 Verificar Estado del Fork de Manu

Si quieres ver si Manu tiene cambios que tú no tienes:

```bash
# Agregar remote de Manu (si existe)
git remote add manu-fork https://github.com/[usuario-manu]/[repo-fork].git

# O si ya existe, ver sus branches
git fetch manu-fork
git branch -r | grep manu-fork

# Ver diferencias
git log main..manu-fork/main
```

---

## ✅ Checklist Antes de Push

- [ ] ¿Todos los cambios están probados localmente?
- [ ] ¿Los archivos `.env*` están en `.gitignore`? (✅ Ya están)
- [ ] ¿La documentación está completa?
- [ ] ¿Los archivos de ejemplo están incluidos? (`.env.example`)

---

## 🚨 Importante: Variables de Entorno

**NUNCA commitees:**
- ❌ `.env.local`
- ❌ `.env.staging`
- ❌ `.env.production`
- ❌ `SUPABASE_SERVICE_ROLE_KEY` con valores reales

**SÍ commitea:**
- ✅ `.env.example` (sin valores reales)
- ✅ Documentación
- ✅ Código fuente

---

## 📋 Resumen de Cambios a Committear

### **Nuevos Archivos:**
```
packages/event-bus/          # Event Bus package completo
lib/config/environment.ts    # Configuración de entornos
lib/event-bus/index.ts      # Singleton del Event Bus
docs/                        # Documentación nueva
.env.example                 # Template de variables de entorno
```

### **Archivos Modificados:**
```
lib/supabase/client.ts       # Usa nueva configuración
app/partner/property/[id]/edit/page.tsx
app/reno/construction-manager/property/[id]/checklist/page.tsx
```

---

## 🎯 Recomendación

**Para mantener todo sincronizado:**

1. **Commitear tus cambios ahora** (usando Opción A o B)
2. **Push al remoto**
3. **Avisar a Manu** que haga `git pull` o que revise el PR
4. **Si Manu tiene cambios**, hacer `git pull` antes de push para evitar conflictos

---

## 🔄 Workflow Recomendado

```bash
# 1. Antes de empezar trabajo nuevo
git pull origin main

# 2. Crear branch para feature
git checkout -b feature/nombre-feature

# 3. Trabajar y commitear
git add .
git commit -m "feat: descripción"

# 4. Push branch
git push origin feature/nombre-feature

# 5. Crear Pull Request en GitHub
# 6. Después de merge, volver a main
git checkout main
git pull origin main
```

---

¿Quieres que te ayude a commitear y hacer push de los cambios ahora?

