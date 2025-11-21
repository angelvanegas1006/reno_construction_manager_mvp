# Decisiones de Arquitectura

## ¿Monorepo o Múltiples Repositorios?

### Recomendación: **Monorepo con Turborepo**

**Razones:**

1. **Código Compartido:**
   - Checklist components
   - UI components
   - Auth logic
   - Storage logic
   - Types
   
   Todo esto se comparte entre las 3 apps. En monorepo es más fácil mantener.

2. **Desarrollo:**
   - Cambios en código compartido se reflejan inmediatamente
   - Un solo `npm install`
   - Un solo repositorio para clonar

3. **Deployment:**
   - Cada app se deploya independientemente
   - Pero desde el mismo repositorio
   - CI/CD más simple

4. **Escalabilidad:**
   - Si más adelante necesitas separar, es fácil
   - Por ahora, monorepo es más eficiente

---

## ¿Qué Plataforma de Deployment?

### Recomendación: **Vercel**

**Razones:**

1. **Next.js Native:**
   - Optimizado para Next.js
   - Zero-config deployment
   - Edge functions incluido

2. **Monorepo Support:**
   - Soporte nativo para monorepos
   - Múltiples proyectos desde un repo
   - Preview deployments automáticos

3. **Free Tier:**
   - Generoso para empezar
   - 100GB bandwidth
   - Edge network global

4. **Alternativas:**
   - **Netlify:** Similar a Vercel, también buena opción
   - **AWS Amplify:** Más complejo pero más control
   - **Docker + K8s:** Overkill para este proyecto

---

## Estructura de Entornos

### Desarrollo (Local)
- Cada app corre en puerto diferente
- `partner`: localhost:3000
- `reno`: localhost:3001
- `super-admin`: localhost:3002

### Staging
- URLs separadas:
  - `partner-staging.vistral.com`
  - `reno-staging.vistral.com`
  - `admin-staging.vistral.com`
- Supabase projects separados
- Datos de prueba

### Production
- URLs separadas:
  - `partner.vistral.com`
  - `reno.vistral.com`
  - `admin.vistral.com`
- Supabase projects separados
- Datos reales

---

## Gestión de Código Compartido

### Packages Compartidos

1. **shared-ui:**
   - Componentes UI (Button, Card, etc.)
   - Componentes de checklist
   - Componentes de formularios

2. **shared-lib:**
   - Auth logic
   - Storage (localStorage, Supabase)
   - Checklist logic
   - Property logic
   - i18n

3. **shared-types:**
   - TypeScript types
   - Interfaces compartidas

### Versionado

- Usar `workspace:*` en monorepo
- Si separas después, usar versiones semver
- Considerar npm private registry si separas

---

## Seguridad

### Separación de Accesos

1. **Middleware por app:**
   - Cada app valida su propio rol
   - Redirección si no tiene acceso

2. **Supabase RLS:**
   - Row Level Security por app
   - Usuarios solo ven sus datos

3. **Dominios separados:**
   - Diferentes cookies por dominio
   - Mejor seguridad

---

## Próximos Pasos

1. ✅ Decidir arquitectura (Monorepo recomendado)
2. ⏳ Setup inicial de estructura
3. ⏳ Migrar código
4. ⏳ Configurar entornos
5. ⏳ Setup deployment

