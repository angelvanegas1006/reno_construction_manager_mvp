# Lógica de Cálculo de Porcentajes del Checklist

## 📊 Resumen General

Los porcentajes del checklist (tanto inicial como final) se calculan de la misma manera. La lógica está implementada en `lib/checklist-progress.ts` y se aplica igual para ambos tipos de checklist.

**⚠️ IMPORTANTE**: La lógica ha sido simplificada para facilitar llegar al 100%. Ahora cuenta **grupos** en lugar de campos individuales.

---

## 🔢 Cálculo de Porcentaje por Sección (SIMPLIFICADO)

### Función: `calculateSectionProgress(section)`

**Fórmula**: `(gruposCompletados / totalGrupos) * 100`

**Cambio clave**: En lugar de contar cada campo individual (cada pregunta, cada upload zone, etc.), ahora cuenta **grupos lógicos** de elementos.

### Grupos que se Cuentan

#### 1. **Grupo: Upload Zones** (Zonas de carga de fotos/videos)
- **Cuenta como**: 1 grupo (sin importar cuántos upload zones haya)
- **Completado**: Si **al menos uno** tiene fotos o videos
- **Ejemplo**: 
  - Sección tiene 3 upload zones (portal, fachada, entorno)
  - Si solo "portal" tiene fotos → grupo completado ✅
  - Porcentaje: 1/1 = 100% (si es el único grupo)

#### 2. **Grupo: Questions** (Preguntas)
- **Cuenta como**: 1 grupo (sin importar cuántas preguntas haya)
- **Completado**: Si **todas** las preguntas tienen `status` seleccionado
- **Ejemplo**:
  - Sección tiene 5 preguntas
  - Si todas tienen status → grupo completado ✅
  - Si alguna no tiene status → grupo incompleto ❌

#### 3. **Dynamic Items** (Habitaciones, Baños)
Para cada habitación/baño se cuentan grupos separados:

##### 3.1. Grupo: Upload Zone del dynamic item
- **Completado**: Si tiene fotos o videos

##### 3.2. Grupo: Questions del dynamic item
- **Completado**: Si **todas** las preguntas tienen `status`

##### 3.3. Grupo: Carpentry Items del dynamic item
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

##### 3.4. Grupo: Climatization Items del dynamic item
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

##### 3.5. Grupo: Mobiliario del dynamic item
- **Completado**: 
  - Si `existeMobiliario === false` → completado ✅
  - Si `existeMobiliario === true` Y tiene `question.status` → completado ✅

#### 4. **Grupo: Carpentry Items** (Secciones fijas como Cocina, Salón)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 5. **Grupo: Climatization Items** (Secciones fijas como Estado General, Salón)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 6. **Grupo: Storage Items** (Cocina)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 7. **Grupo: Appliances Items** (Cocina)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 8. **Grupo: Security Items** (Exteriores)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 9. **Grupo: Systems Items** (Exteriores)
- **Solo cuenta si**: Hay al menos un item con `cantidad > 0`
- **Completado**: Si **todos** los items con `cantidad > 0` tienen `estado` (o todas sus `units` tienen `estado`)

#### 10. **Grupo: Mobiliario** (Secciones fijas como Salón)
- **Completado**: 
  - Si `existeMobiliario === false` → completado ✅
  - Si `existeMobiliario === true` Y tiene `question.status` → completado ✅

---

## 📈 Cálculo de Porcentaje General

### Función: `calculateOverallChecklistProgress(checklist)`

**Fórmula**: `promedio de todas las secciones`

**Secciones consideradas** (siempre las 8 secciones):
1. `entorno-zonas-comunes`
2. `estado-general`
3. `entrada-pasillos`
4. `habitaciones`
5. `salon`
6. `banos`
7. `cocina`
8. `exteriores`

**Lógica**:
- Si una sección existe → usar su porcentaje calculado
- Si una sección NO existe → contar como 0%
- **Promedio**: Suma de todos los porcentajes / 8 secciones

**Ejemplo**:
- Entorno: 33%
- Estado General: 0%
- Entrada: 0%
- Habitaciones: 0%
- Salón: 0%
- Baños: 0%
- Cocina: 0%
- Exteriores: 0%
- **Promedio**: (33 + 0 + 0 + 0 + 0 + 0 + 0 + 0) / 8 = 4.125% ≈ **4%**

---

## ⚠️ Puntos Importantes

### 1. **Items con Cantidad 0 NO Cuentan**
- Si un item de carpintería/climatización tiene `cantidad: 0`, NO se cuenta en el total
- Solo se cuentan grupos que tienen al menos un item con `cantidad > 0`
- **Ejemplo**: Si todos los carpentry items tienen `cantidad: 0`, ese grupo NO se cuenta

### 2. **Questions Requieren Status en TODAS**
- **Todas** las preguntas deben tener `status` para que el grupo cuente como completado
- Si una pregunta no tiene `status`, el grupo completo está incompleto
- Esto es importante porque ahora las preguntas empiezan sin status por defecto

### 3. **Upload Zones: Al Menos Uno Completo**
- El grupo está completo si **al menos uno** de los upload zones tiene fotos o videos
- No es necesario que todos tengan fotos

### 4. **Dynamic Items: Grupos Separados por Instancia**
- Si hay 3 habitaciones, cada una tiene sus propios grupos
- Cada habitación puede tener: upload zone, questions, carpentry items, climatization items, mobiliario
- Cada uno cuenta como un grupo separado

### 5. **Mobiliario Completo si No Existe**
- Si `existeMobiliario === false`, cuenta como completado (no requiere más información)
- Si `existeMobiliario === true`, necesita `question.status` para estar completo

### 6. **Facilidad para Llegar al 100%**
- Al contar grupos en lugar de campos individuales, es más fácil llegar al 100%
- Ejemplo: En lugar de necesitar completar 8 campos (3 upload zones + 5 questions), solo necesitas completar 2 grupos

---

## 🔄 Aplicación para Checklist Inicial y Final

**La misma lógica se aplica para ambos tipos de checklist** porque:
- Ambos usan la misma función `calculateSectionProgress()`
- Ambos usan la misma función `calculateOverallChecklistProgress()`
- La estructura de datos es idéntica para ambos tipos

**Diferencia**: Solo cambia el `checklistType` (`reno_initial` vs `reno_final`), pero el cálculo de porcentajes es idéntico.

---

## 📝 Ejemplo Práctico: "Entorno y Zonas Comunes" con 33%

### Con la Nueva Lógica Simplificada:

#### Grupos Totales:
1. **Grupo Upload Zones**: 
   - Portal tiene fotos ✅
   - Fachada sin fotos ❌
   - Entorno sin fotos ❌
   - **Grupo completado**: ✅ (al menos uno tiene fotos)

2. **Grupo Questions**:
   - Acceso-principal sin status ❌
   - Acabados sin status ❌
   - Comunicaciones sin status ❌
   - Electricidad sin status ❌
   - Carpinteria sin status ❌
   - **Grupo completado**: ❌ (no todas tienen status)

### Cálculo:
- **Total grupos**: 2
- **Completados**: 1 (solo upload zones está completo)
- **Porcentaje**: 1/2 = 50%

**Nota**: Si muestra 33%, podría ser que la sección tiene 3 grupos y solo 1 está completo (1/3 = 33%), o que la lógica anterior todavía está en uso.

---

## 🐛 Posibles Problemas

### Problema 1: Porcentaje No Coincide con lo Esperado
- **Causa**: Puede que algunos campos no se estén contando correctamente
- **Solución**: Revisar que todos los campos tengan los datos correctos

### Problema 2: Porcentaje No Actualiza Después de Guardar
- **Causa**: El checklist no se está recargando desde Supabase
- **Solución**: Verificar que `refetchInspection()` se esté llamando después de guardar

### Problema 3: Questions Sin Status No Cuentan
- **Causa**: Las preguntas ahora empiezan sin status por defecto
- **Solución**: Esto es correcto - las preguntas deben tener status para contar como completadas

---

## 🔍 Debugging

Para ver qué campos se están contando, revisar los logs en la consola:
- `[convertQuestionsToElements]` - muestra qué preguntas se están procesando
- `[convertUploadZonesToElements]` - muestra qué upload zones se están procesando
- `[useSupabaseChecklistBase] 💾 Saving X elements` - muestra qué elementos se están guardando

