# 🔐 Solución al Error 401 en n8n al Insertar Categorías

## ❌ Error 401: Unauthorized

Este error significa que Supabase no está reconociendo tus credenciales. Aquí están las soluciones:

## ✅ Solución 1: Verificar que estás usando el SERVICE ROLE KEY

**⚠️ IMPORTANTE**: Debes usar el **SERVICE ROLE KEY**, NO el **ANON KEY**.

### Cómo obtener el Service Role Key:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (DEV: `kqqobbxjyrdputngvxrf`)
3. Ve a **Settings** → **API**
4. Busca la sección **Project API keys**
5. Copia el **`service_role`** key (NO el `anon` key)

### Diferencias:

- ❌ **ANON KEY**: Empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` pero tiene permisos limitados
- ✅ **SERVICE ROLE KEY**: También empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` pero tiene permisos completos

> 💡 **Tip**: El Service Role Key tiene la palabra "service_role" en el payload del JWT cuando lo decodificas.

## ✅ Solución 2: Configurar Variables de Entorno en n8n

### Paso 1: Crear Variable de Entorno

1. En n8n, ve a **Settings** → **Environment Variables**
2. Haz clic en **Add Variable**
3. Configura:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Pega tu Service Role Key completo
   - **Type**: `Secret` (recomendado)

### Paso 2: Usar la Variable en el Nodo HTTP Request

En los headers del nodo HTTP Request, usa:

```
apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
```

## ✅ Solución 3: Verificar Headers Correctos

Asegúrate de que los headers estén configurados **exactamente** así:

| Header | Valor | ✅ Correcto |
|--------|-------|-------------|
| `apikey` | `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}` | ✅ |
| `Authorization` | `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}` | ✅ |
| `Content-Type` | `application/json` | ✅ |
| `Prefer` | `return=representation` | ✅ |

### ⚠️ Errores Comunes:

❌ **Incorrecto**: `Authorization: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`  
✅ **Correcto**: `Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`

> 💡 **Nota**: La palabra "Bearer" seguida de un espacio es **obligatoria**.

## ✅ Solución 4: Verificar la URL

Asegúrate de que la URL sea correcta:

**Para DEV:**
```
https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories
```

**Para PROD:**
```
https://[TU_PROJECT_ID].supabase.co/rest/v1/property_dynamic_categories
```

## 🧪 Prueba Rápida en n8n

Crea un workflow de prueba con estos nodos:

### 1. Nodo Manual Trigger
- Solo para iniciar el workflow manualmente

### 2. Nodo Set (Configurar datos de prueba)
```json
{
  "property_id": "SP-Q4X-HPS-003953",
  "category_name": "TEST CATEGORY",
  "activities_text": "Prueba de inserción",
  "percentage": null
}
```

### 3. Nodo HTTP Request
- **Method**: `POST`
- **URL**: `https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories`
- **Headers**:
  ```
  apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Content-Type: application/json
  Prefer: return=representation
  ```
- **Body**: `{{ $json }}`

### 4. Nodo IF (Verificar respuesta)
- **Condition**: `{{ $json.statusCode }} === 201`
- Si es 201 → ✅ Éxito
- Si es 401 → ❌ Revisa la autenticación

## 🔍 Debug: Verificar qué Key estás usando

Si quieres verificar qué key estás usando en n8n, agrega un nodo **Code** antes del HTTP Request:

```javascript
// Verificar que la variable existe
const serviceKey = $env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado');
}

// Mostrar primeros caracteres (sin exponer el key completo)
console.log('Service Key (primeros 20 chars):', serviceKey.substring(0, 20));

// Verificar que empieza con el formato correcto
if (!serviceKey.startsWith('eyJ')) {
  throw new Error('El Service Key no tiene el formato correcto');
}

return $input.all();
```

## 📋 Checklist de Verificación

Antes de ejecutar el workflow en n8n, verifica:

- [ ] Tienes el **SERVICE ROLE KEY** (no el ANON KEY)
- [ ] La variable de entorno `SUPABASE_SERVICE_ROLE_KEY` está configurada en n8n
- [ ] El header `Authorization` tiene el formato: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- [ ] El header `apikey` está configurado: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- [ ] La URL es correcta: `https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories`
- [ ] El método es `POST`
- [ ] El `Content-Type` es `application/json`

## 🆘 Si aún tienes el error 401

1. **Verifica en Supabase Dashboard**:
   - Ve a **Settings** → **API**
   - Copia el **service_role** key nuevamente
   - Asegúrate de que no tenga espacios al inicio o final

2. **Verifica en n8n**:
   - Ve a **Settings** → **Environment Variables**
   - Verifica que `SUPABASE_SERVICE_ROLE_KEY` existe
   - Verifica que el valor es correcto (sin espacios extra)

3. **Prueba con cURL** (desde tu terminal):
   ```bash
   curl -X POST \
     'https://kqqobbxjyrdputngvxrf.supabase.co/rest/v1/property_dynamic_categories' \
     -H 'apikey: TU_SERVICE_ROLE_KEY_AQUI' \
     -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY_AQUI' \
     -H 'Content-Type: application/json' \
     -H 'Prefer: return=representation' \
     -d '{
       "property_id": "SP-Q4X-HPS-003953",
       "category_name": "TEST",
       "activities_text": "Prueba",
       "percentage": null
     }'
   ```
   
   Si funciona con cURL pero no en n8n, el problema está en la configuración de n8n.

## 📞 Obtener Ayuda

Si después de seguir estos pasos aún tienes el error 401:

1. Verifica los logs del nodo HTTP Request en n8n
2. Revisa el mensaje de error completo
3. Verifica que el Service Role Key sea del proyecto correcto (DEV vs PROD)






