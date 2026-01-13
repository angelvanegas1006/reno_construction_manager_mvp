# Actualización del Design System PropHero - Checklist

## Estado actual

### Tokens definidos (prophero.css)
- ✅ Brand Blues (blue-50 a blue-950)
- ✅ Semantic Colors (success, warning, danger, info)
- ✅ Neutral Grays (gray-50 a gray-950)
- ✅ Typography Scale (font-family, sizes, weights, line-heights)
- ✅ Spacing Scale (spacing-0 a spacing-20)
- ✅ Border Radius (radius-none a radius-full)
- ✅ Shadows (shadow-sm a shadow-xl)
- ✅ Transitions (transition-fast, base, slow)

### Problemas encontrados

**64 instancias** de clases hardcodeadas en componentes que deberían usar tokens:
- `bg-blue-50`, `bg-blue-100`, etc. → debería usar `bg-[var(--prophero-blue-50)]` o variables CSS
- `text-blue-600`, `text-blue-400`, etc. → debería usar `text-[var(--prophero-blue-600)]`
- `bg-zinc-900`, `bg-zinc-800`, etc. → debería usar tokens de gray
- `border-blue-200`, `border-blue-800`, etc. → debería usar tokens

### Archivos afectados
1. `components/property/sections/info-propiedad-section.tsx` (8 instancias)
2. `components/property/sections/info-economica-section.tsx` (7 instancias)
3. `components/property/sections/estado-legal-section.tsx` (15 instancias)
4. `components/property/sections/documentacion-section.tsx` (6 instancias)
5. `components/property/edit-sidebar.tsx` (6 instancias)
6. `components/property/mobile-sidebar-menu.tsx` (9 instancias)
7. `components/partner/kanban-header.tsx` (3 instancias)
8. `components/partner/sidebar.tsx` (2 instancias)
9. `components/kanban/property-card.tsx` (4 instancias)
10. `components/kanban/kanban-column.tsx` (1 instancia)
11. Otros componentes

## Plan de acción

### Paso 1: Actualizar tokens en prophero.css
- [ ] Verificar colores actualizados en design system
- [ ] Actualizar valores si han cambiado
- [ ] Agregar nuevos tokens si existen

### Paso 2: Reemplazar clases hardcodeadas
- [ ] Crear utilidades CSS o clases de Tailwind que usen tokens
- [ ] Reemplazar `bg-blue-*` con tokens de PropHero
- [ ] Reemplazar `text-blue-*` con tokens de PropHero
- [ ] Reemplazar `bg-zinc-*` con tokens de gray
- [ ] Reemplazar `border-*` con tokens

### Paso 3: Verificar componentes UI base
- [ ] Button component usa tokens correctamente
- [ ] Input component usa tokens correctamente
- [ ] Otros componentes UI (Select, Dialog, etc.)

### Paso 4: Dark mode
- [ ] Verificar tokens de dark mode
- [ ] Asegurar contraste correcto
- [ ] Probar transiciones entre modos

## Información necesaria del usuario

Para completar la actualización correctamente, necesito:

1. **¿Qué cambió específicamente en el design system de PropHero?**
   - ¿Colores nuevos o modificados?
   - ¿Valores hexadecimales actualizados?
   - ¿Nuevos tokens agregados?

2. **¿Hay documentación actualizada disponible?**
   - Link a la documentación
   - Screenshots de los nuevos tokens
   - Lista de cambios

3. **¿Qué componentes del design system fueron actualizados?**
   - ¿Hay nuevos componentes?
   - ¿Cambios en componentes existentes?

## Mapeo de clases a tokens (propuesto)

### Backgrounds
- `bg-blue-50` → `bg-[var(--prophero-blue-50)]` o crear clase utility
- `bg-blue-100` → `bg-[var(--prophero-blue-100)]`
- `bg-zinc-900` → `bg-[var(--prophero-gray-900)]`
- `bg-white` → `bg-background` o `bg-card`

### Text
- `text-blue-600` → `text-[var(--prophero-blue-600)]`
- `text-blue-900` → `text-[var(--prophero-blue-900)]`
- `text-zinc-400` → `text-[var(--prophero-gray-400)]`

### Borders
- `border-blue-200` → `border-[var(--prophero-blue-200)]`
- `border-zinc-800` → `border-[var(--prophero-gray-800)]`

## Notas

- Los componentes de shadcn/ui ya usan variables CSS (`bg-background`, `text-foreground`, etc.) que están mapeadas a tokens de PropHero en `globals.css`
- Necesitamos extender este patrón a todos los componentes
- Considerar crear clases de utilidad Tailwind personalizadas para los tokens de PropHero








