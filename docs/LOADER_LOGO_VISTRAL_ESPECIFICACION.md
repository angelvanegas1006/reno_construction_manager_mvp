# Especificación: Loader con logo Vistral

Documento para implementar un loader de carga que use el **logo de Vistral** (el mismo que aparece en la sidebar, arriba a la izquierda) con animación. El loader debe mostrarse en las pantallas de carga del Construction Manager (Reno).

---

## 1. Objetivo

- Sustituir el spinner genérico actual por un loader que muestre el **icono circular del logo Vistral** (la “bolita” formada por 8 segmentos).
- La animación puede ser:
  - **Opción A – Palitos moviéndose:** los 8 segmentos del logo se animan en secuencia (por ejemplo opacidad o escala), dando sensación de “palitos que se van moviendo”.
  - **Opción B – Bolita moviéndose:** el logo completo gira (rotación 360° en bucle).
- Lo ideal es poder elegir entre ambas (por ejemplo con un prop `variant`).

---

## 2. Referencia visual del logo

- El logo está en la **sidebar** del Construction Manager (arriba a la izquierda).
- Asset del icono: **`public/vistral-logo.svg`** (y `public/vistral-logo-dark.svg` para tema oscuro).
- El SVG del icono tiene **8 paths** que forman un círculo tipo “queso”:
  - 1 segmento azul: `#2050F6`
  - 7 segmentos oscuros: `#212121`
- ViewBox del SVG: `0 0 430 430`. Solo se usa el icono circular (los 8 paths), **sin** el texto “VISTRAL / by PropHero”.

Para poder animar cada segmento por separado hace falta usar el SVG **inline** (copiar los 8 `<path>` dentro del componente), no solo una etiqueta `<img>`.

---

## 3. Requisitos del componente

### 3.1 Props

| Prop        | Tipo                    | Obligatorio | Por defecto  | Descripción |
|------------|-------------------------|-------------|--------------|-------------|
| `className`| `string`                | No          | -            | Clases CSS para el contenedor (ej. para altura mínima). |
| `size`     | `'sm' \| 'md' \| 'lg'`  | No          | `'md'`       | Tamaño del loader. Ej. `sm`: 32px, `md`: 64px, `lg`: 96px. |
| `variant`  | `'spin' \| 'segments'` | No          | `'segments'` | Tipo de animación: rotación completa o segmentos en secuencia. |

### 3.2 Accesibilidad

- Contenedor con `role="status"` y `aria-label="Cargando"`.
- Texto solo para lectores de pantalla (ej. `<span className="sr-only">Cargando…</span>`).

### 3.3 Dónde se usa el loader

El loader debe usarse en los mismos sitios donde hoy se muestra el spinner de carga del Reno Construction Manager:

- **Home** del Construction Manager (`/reno/construction-manager`).
- **Kanban** (`/reno/construction-manager/kanban`).
- **Detalle de propiedad** (`/reno/construction-manager/property/[id]`).
- **Checklist** de una propiedad (`/reno/construction-manager/property/[id]/checklist`).

En la home se usa con `className="min-h-[400px]"` para dar altura mínima al área de carga.

---

## 4. Implementación técnica

### 4.1 Keyframes CSS

Definir dos animaciones (por ejemplo en `app/globals.css` o en un módulo CSS del componente):

**Segmentos (palitos):**

- Nombre sugerido: `vistral-segment-pulse`.
- Efecto: por ejemplo opacidad de 0.5 a 1 y/o escala de 0.98 a 1, en bucle.
- Duración sugerida: ~1.2 s, `ease-in-out`, `infinite`.
- Cada uno de los 8 paths tendrá la misma animación pero con **`animation-delay`** distinto (0s, 0.12s, 0.24s, …) para lograr el efecto en secuencia.

**Spin (bolita):**

- Nombre sugerido: `vistral-spin`.
- Efecto: `transform: rotate(0deg)` → `rotate(360deg)`.
- Duración sugerida: ~1.5 s, `linear`, `infinite`.
- Se aplica al contenedor del SVG, no a cada path.

### 4.2 Componente React

- **Ubicación sugerida:** `components/reno/vistral-logo-loader.tsx` (o `components/vistral-logo-loader.tsx` si debe ser reutilizable fuera de reno).
- Incluir el SVG del logo **inline**: los 8 paths copiados de `public/vistral-logo.svg`, con los atributos `d` y `fill` correspondientes.
- Para **variant="segments"**: aplicar a cada `<path>` la clase de la animación de segmentos y un `style={{ animationDelay: \`${i * 0.12}s\` }}` (i = 0..7). Opcional: `transform-origin: center` para que la escala sea desde el centro.
- Para **variant="spin"**: envolver el SVG en un `div` y aplicar la clase de la animación de rotación a ese `div`.
- Tamaños: por ejemplo `sm`: `w-8 h-8`, `md`: `w-16 h-16`, `lg`: `w-24 h-24` (Tailwind).

### 4.3 Integración

- Donde ahora se use el loader antiguo (por ejemplo `RenoHomeLoader`), sustituir por el nuevo componente.
- Mantener la misma API donde sea posible (`className`, `size`) para no romper layouts (ej. `className="min-h-[400px]"` en la home).

---

## 5. Archivos de referencia en el proyecto

Si quieres ver una implementación ya hecha en este repo:

- **Componente del loader:** `components/reno/vistral-logo-loader.tsx`
- **Keyframes CSS:** `app/globals.css` (buscar `vistral-segment-pulse` y `vistral-spin`)
- **Logo SVG (origen de los paths):** `public/vistral-logo.svg`
- **Logo usado en la sidebar:** `components/vistral-logo.tsx`

---

## 6. Resumen de tareas

1. Añadir en CSS los keyframes `vistral-segment-pulse` y `vistral-spin` y las clases que los usen.
2. Crear el componente `VistralLogoLoader` con SVG inline (8 paths), props `className`, `size`, `variant`, y las dos variantes de animación.
3. Sustituir el loader actual por `VistralLogoLoader` en: home Construction Manager, Kanban, detalle de propiedad y página de checklist.
4. Comprobar accesibilidad (`role="status"`, `aria-label`, texto oculto) y que en tema claro/oscuro se vea bien (los colores del SVG pueden quedarse en `#2050F6` y `#212121` o adaptarse si hay diseño para dark).

Si tienes dudas sobre el diseño del logo o los puntos de uso, se puede revisar con el equipo.
