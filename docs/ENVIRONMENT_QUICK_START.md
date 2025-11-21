# ⚡ Quick Start: Configurar Entornos

Guía rápida para configurar dev, staging y production.

---

## 🎯 Setup Rápido (5 minutos)

### **1. Crear Proyectos Supabase**

Crea 3 proyectos en [Supabase Dashboard](https://app.supabase.com):
- `vistral-dev` (Development)
- `vistral-staging` (Staging)  
- `vistral-prod` (Production)

### **2. Crear Archivos de Entorno**

```bash
# Development
npm run env:dev
# Edita .env.local con credenciales de vistral-dev

# Staging
npm run env:staging
# Edita .env.staging con credenciales de vistral-staging

# Production
npm run env:prod
# Edita .env.production con credenciales de vistral-prod
```

### **3. Ejecutar Migraciones**

```bash
# Ver instrucciones para cada entorno
./scripts/migrate-db.sh dev
./scripts/migrate-db.sh staging
./scripts/migrate-db.sh prod
```

O manualmente:
1. Ve a cada proyecto Supabase
2. SQL Editor → Ejecuta `supabase/migrations/001_checklist_migrations.sql`

### **4. Probar**

```bash
# Development
npm run dev

# Staging (build local)
npm run build:staging
npm run start:staging

# Production (build local)
npm run build:prod
npm run start:prod
```

---

## 📋 Checklist Rápido

- [ ] 3 proyectos Supabase creados
- [ ] `.env.local` configurado (dev)
- [ ] `.env.staging` configurado
- [ ] `.env.production` configurado
- [ ] Migraciones ejecutadas en los 3 entornos
- [ ] `npm run dev` funciona
- [ ] Login funciona en dev

---

## 🔗 Enlaces Útiles

- [Guía Completa](./SETUP_ENVIRONMENTS.md)
- [Event Bus Setup](./event-bus-setup-guide.md)
- [Supabase Dashboard](https://app.supabase.com)

---

¿Problemas? Revisa [SETUP_ENVIRONMENTS.md](./SETUP_ENVIRONMENTS.md) para más detalles.
