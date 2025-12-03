# 📋 Instrucciones para Crear Pull Request

## ✅ Estado Actual

- ✅ Commit realizado: `0d86fd6 - fix: Corregir sincronización de Estimated Visit Date a Airtable`
- ✅ Archivos modificados:
  - `app/reno/construction-manager/property/[id]/page.tsx`
  - `lib/airtable/client.ts`
  - `package.json`
  - `scripts/debug-estimated-visit-sync.ts` (nuevo)

## 🚀 Pasos para Crear el PR

### 1. Hacer Push a tu Fork

```bash
# Si tienes problemas de autenticación, usa SSH o configura un token
git push origin develop
```

**Alternativa con SSH** (si tienes SSH configurado):
```bash
# Verificar remoto
git remote set-url origin git@github.com:manuelPH/reno_construction_manager_mvp.git
git push origin develop
```

### 2. Crear Pull Request en GitHub

1. Ve a: https://github.com/angelvanegas1006/reno_construction_manager_mvp
2. Click en "Pull requests"
3. Click en "New pull request"
4. Selecciona:
   - **Base**: `dev` (de angelvanegas1006)
   - **Compare**: `develop` (de manuelPH)
5. Click en "Create pull request"

### 3. Título y Descripción del PR

**Título:**
```
fix: Corregir sincronización de Estimated Visit Date a Airtable
```

**Descripción:**
Copia el contenido de `PR_DESCRIPTION.md` o usa este resumen:

```markdown
## 🐛 Problema
Al actualizar "Estimated Visit Date" desde la aplicación, el campo no se sincronizaba a Airtable porque el código intentaba buscar el registro cuando ya teníamos el record ID directo.

## ✅ Solución
- Detección automática: Si `airtable_property_id` empieza con "rec", se usa directamente como record ID
- Mejoras en logging para facilitar debugging
- Nuevo script de debug: `npm run debug:estimated-visit-sync`

## 📁 Archivos Modificados
- `app/reno/construction-manager/property/[id]/page.tsx` - Detección inteligente de record ID
- `lib/airtable/client.ts` - Logging mejorado
- `package.json` - Nuevo script de debug
- `scripts/debug-estimated-visit-sync.ts` - Script de diagnóstico

## 🧪 Testing
✅ Verificado con script de debug en propiedad "C. Calvario, 41, 2º-A, Algezares (Murcia)"
✅ Confirmado que la actualización a Airtable funciona correctamente
```

### 4. Etiquetas (Labels)
- `bug`
- `airtable`
- `sync`

---

## 📝 Notas Adicionales

- **Commits incluidos en el PR**: 
  - `0d86fd6` - fix: Corregir sincronización de Estimated Visit Date a Airtable
  - También incluye commits anteriores que ya estaban en `develop`

- **Cambios en upstream/dev**: Hay algunos commits nuevos en `upstream/dev` que no están en `develop`, pero no deberían causar conflictos con este PR.

- **Si hay conflictos**: 
  ```bash
  git fetch upstream dev
  git merge upstream/dev
  # Resolver conflictos si los hay
  git push origin develop
  ```

---

## 🔗 Enlaces Útiles

- Repositorio base: https://github.com/angelvanegas1006/reno_construction_manager_mvp
- Tu fork: https://github.com/manuelPH/reno_construction_manager_mvp
- Comparar cambios: https://github.com/angelvanegas1006/reno_construction_manager_mvp/compare/dev...manuelPH:develop
