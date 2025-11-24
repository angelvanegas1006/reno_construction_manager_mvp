# ⚙️ Configuración de Variables de Entorno en Vercel

## 📋 Variables Necesarias para Vercel

Una vez que tengas las keys correctas de Supabase, configura estas variables en Vercel:

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables

Agrega estas variables una por una:

#### 1. Supabase URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://kqqobbxjyrdputngvxrf.supabase.co
Environment: Production, Preview, Development
```

#### 2. Supabase Anon Key
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJ... (la key anon que obtengas del dashboard)
Environment: Production, Preview, Development
```

#### 3. Supabase Service Role Key (Opcional pero recomendado)
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJ... (la key service_role)
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

#### 4. Airtable API Key
```
Key: NEXT_PUBLIC_AIRTABLE_API_KEY
Value: patgm06CFi5OvzcwG.609e8bc3ffd4e8c4e007cc24ab09be229595d344d189c901609dca99d4341d54
Environment: Production, Preview, Development
```

#### 5. Airtable Base ID
```
Key: NEXT_PUBLIC_AIRTABLE_BASE_ID
Value: appT59F8wolMDKZeG
Environment: Production, Preview, Development
```

#### 6. Airtable Table Name
```
Key: NEXT_PUBLIC_AIRTABLE_TABLE_NAME
Value: Properties
Environment: Production, Preview, Development
```

#### 7. Airtable Webhook Secret (Opcional)
```
Key: AIRTABLE_WEBHOOK_SECRET
Value: tu_secret_aqui (genera uno tú)
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

### Paso 3: Guardar

Después de agregar cada variable:
1. Selecciona los entornos donde aplicará (Production, Preview, Development)
2. Click **Save**
3. Repite para cada variable

## ✅ Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (opcional)
- [ ] `NEXT_PUBLIC_AIRTABLE_API_KEY` configurada
- [ ] `NEXT_PUBLIC_AIRTABLE_BASE_ID` configurada
- [ ] `NEXT_PUBLIC_AIRTABLE_TABLE_NAME` configurada
- [ ] `AIRTABLE_WEBHOOK_SECRET` configurada (opcional)

## 🔄 Después de Configurar

1. Haz un nuevo deploy o espera al siguiente push
2. Las variables estarán disponibles en tu aplicación
3. Verifica que todo funciona correctamente

