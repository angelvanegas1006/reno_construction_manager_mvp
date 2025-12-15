# 🔐 Configuración de Credenciales AWS S3 para PDFs

## 📋 Variables de Entorno Requeridas

Para que el proxy de PDFs funcione correctamente, necesitas configurar estas variables de entorno:

### 1. AWS_S3_USERNAME
- **Descripción**: Usuario para autenticación básica HTTP en el bucket de AWS S3
- **Valor**: `prophero`
- **Sensible**: ✅ Sí (marca como sensitive en Vercel)

### 2. AWS_S3_PASSWORD
- **Descripción**: Contraseña para autenticación básica HTTP en el bucket de AWS S3
- **Valor**: `DocPropHero2024!`
- **Sensible**: ✅ Sí (marca como sensitive en Vercel)

## 🚀 Configuración Local (.env.local)

Agrega estas variables a tu archivo `.env.local`:

```env
# AWS S3 Credentials for PDF Proxy
AWS_S3_USERNAME=prophero
AWS_S3_PASSWORD=DocPropHero2024!
```

**⚠️ Importante**: El archivo `.env.local` está en `.gitignore` y no debe ser commiteado al repositorio.

## 🌐 Configuración en Vercel

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables

Agrega estas dos variables:

#### Variable 1: AWS_S3_USERNAME
```
Key: AWS_S3_USERNAME
Value: prophero
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

#### Variable 2: AWS_S3_PASSWORD
```
Key: AWS_S3_PASSWORD
Value: DocPropHero2024!
Environment: Production, Preview, Development
Sensitive: ✅ Marca como sensitive
```

### Paso 3: Guardar y Redesplegar

1. Click **Save** para cada variable
2. Ve a **Deployments** y haz un **Redeploy** del último deployment para que las variables surtan efecto

## ✅ Verificación

Después de configurar las variables:

1. **Local**: Reinicia el servidor de desarrollo (`npm run dev`)
2. **Vercel**: Espera a que termine el redeploy
3. Intenta cargar un PDF desde la tab "Presupuesto de reforma"
4. Si las credenciales están correctas, el PDF debería cargarse sin errores de autenticación

## 🔍 Troubleshooting

### Error: "Server configuration error: AWS S3 credentials not configured"

**Causa**: Las variables de entorno no están configuradas o no están disponibles.

**Solución**:
1. Verifica que las variables estén en `.env.local` (local) o en Vercel (producción)
2. Reinicia el servidor después de agregar las variables
3. En Vercel, asegúrate de hacer un redeploy después de agregar las variables

### Error: "Failed to fetch PDF: 401 Unauthorized"

**Causa**: Las credenciales son incorrectas o el formato de autenticación no es el esperado.

**Solución**:
1. Verifica que `AWS_S3_USERNAME` sea exactamente `prophero` (sin espacios)
2. Verifica que `AWS_S3_PASSWORD` sea exactamente `DocPropHero2024!` (con la exclamación)
3. Verifica que las variables estén marcadas como "Sensitive" en Vercel pero que los valores sean correctos

### Error: "Failed to fetch PDF: 404 Not Found"

**Causa**: La URL del PDF es incorrecta o el archivo no existe en el bucket.

**Solución**:
1. Verifica que `budget_pdf_url` en Supabase tenga una URL válida
2. Verifica que el archivo exista en el bucket de AWS S3
3. Verifica que las credenciales tengan permisos para acceder a ese archivo

## 📝 Notas de Seguridad

- ✅ Las credenciales están almacenadas como variables de entorno (no hardcodeadas)
- ✅ Las variables están marcadas como "Sensitive" en Vercel
- ✅ El archivo `.env.local` está en `.gitignore` y no se commitea
- ⚠️ **No compartas estas credenciales públicamente**
- ⚠️ **Rota las contraseñas periódicamente si es posible**

