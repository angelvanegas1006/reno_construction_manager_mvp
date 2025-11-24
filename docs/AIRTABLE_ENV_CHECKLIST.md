# Checklist de Variables de Entorno para Airtable

## ✅ Variables que ya tienes configuradas

1. ✅ **NEXT_PUBLIC_AIRTABLE_API_KEY** 
   - Valor: `patgm06CFi5OvzcwG.609e8bc3ffd4e8c4e007cc24ab09be229595d344d189c901609dca99d4341d54`
   - Uso: Para hacer llamadas a la API de Airtable (App → Airtable)

2. ✅ **NEXT_PUBLIC_AIRTABLE_BASE_ID**
   - Valor: `appT59F8wolMDKZeG`
   - Uso: Identifica tu base de Airtable

3. ✅ **NEXT_PUBLIC_AIRTABLE_TABLE_NAME**
   - Valor: `Properties` (probablemente)
   - Uso: Nombre de la tabla en Airtable

## ⚠️ Variables que faltan (opcionales pero recomendadas)

### 1. **NEXT_PUBLIC_APP_URL** o **VERCEL_URL** (para webhooks)

**¿Para qué sirve?**
- Para construir automáticamente la URL del webhook
- Necesaria si quieres usar el script `npm run setup:airtable-webhook`

**Ejemplos:**
```env
# Si tienes un dominio personalizado
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

# O si usas Vercel (se configura automáticamente en producción)
VERCEL_URL=tu-app.vercel.app
```

**Nota**: En desarrollo local, puedes usar `ngrok` o configurar manualmente `AIRTABLE_WEBHOOK_URL`

### 2. **AIRTABLE_WEBHOOK_URL** (alternativa a NEXT_PUBLIC_APP_URL)

**¿Para qué sirve?**
- URL completa del webhook si no quieres usar NEXT_PUBLIC_APP_URL
- Útil si tienes una URL específica diferente a la app

**Ejemplo:**
```env
AIRTABLE_WEBHOOK_URL=https://tu-dominio.com/api/webhooks/airtable
```

### 3. **AIRTABLE_WEBHOOK_SECRET** (seguridad - opcional pero recomendado)

**¿Para qué sirve?**
- Autenticación del webhook para asegurar que solo Airtable puede enviar eventos
- Sin esto, cualquiera con la URL puede enviar webhooks (menos seguro)

**Cómo obtenerlo:**
1. Cuando configures el webhook en Airtable, puedes generar un secret
2. O crea uno tú mismo (cualquier string aleatorio)

**Ejemplo:**
```env
AIRTABLE_WEBHOOK_SECRET=mi_secret_super_seguro_12345
```

## 📋 Resumen

### Mínimo necesario (ya lo tienes):
- ✅ NEXT_PUBLIC_AIRTABLE_API_KEY
- ✅ NEXT_PUBLIC_AIRTABLE_BASE_ID
- ✅ NEXT_PUBLIC_AIRTABLE_TABLE_NAME

### Para webhooks automáticos (recomendado):
- ⚠️ NEXT_PUBLIC_APP_URL (o VERCEL_URL en producción)
- ⚠️ AIRTABLE_WEBHOOK_SECRET (seguridad)

### Configuración completa recomendada:

```env
# Airtable API (ya configurado)
NEXT_PUBLIC_AIRTABLE_API_KEY=patgm06CFi5OvzcwG.609e8bc3ffd4e8c4e007cc24ab09be229595d344d189c901609dca99d4341d54
NEXT_PUBLIC_AIRTABLE_BASE_ID=appT59F8wolMDKZeG
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=Properties

# Webhook URL (falta configurar)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# O alternativamente:
# AIRTABLE_WEBHOOK_URL=https://tu-dominio.com/api/webhooks/airtable

# Webhook Security (opcional pero recomendado)
AIRTABLE_WEBHOOK_SECRET=tu_secret_aqui
```

## 🚀 Próximos pasos

1. **Si tienes un dominio**: Agrega `NEXT_PUBLIC_APP_URL` con tu dominio
2. **Si usas Vercel**: `VERCEL_URL` se configura automáticamente en producción
3. **Si estás en desarrollo local**: Usa `ngrok` o configura `AIRTABLE_WEBHOOK_URL` manualmente
4. **Para seguridad**: Genera y configura `AIRTABLE_WEBHOOK_SECRET`

## 💡 Nota importante

**No necesitas compartir estas variables conmigo** - solo necesitas configurarlas en tu `.env.local`:
- `NEXT_PUBLIC_APP_URL` - Tu dominio (ej: `https://vistral.com`)
- `AIRTABLE_WEBHOOK_SECRET` - Un string aleatorio que tú generes

