# 🔗 Cómo Agregar Redirect URIs en Google Cloud Console

## 📍 Pasos Detallados

### **Paso 1: Ir a Credentials (Credenciales)**

1. En Google Cloud Console, en el menú lateral izquierdo, busca y haz clic en **"APIs & Services"** (APIs y Servicios)
2. Luego haz clic en **"Credentials"** (Credenciales)

### **Paso 2: Abrir tu OAuth 2.0 Client ID**

1. En la lista de credenciales, busca tu OAuth 2.0 Client ID (debería tener el nombre que le diste, por ejemplo "Vistral Web Client")
2. Haz clic en el nombre del Client ID para abrirlo

### **Paso 3: Agregar Authorized redirect URIs**

1. En la página de detalles del Client ID, busca la sección **"Authorized redirect URIs"** (URIs de redirección autorizados)
2. Haz clic en **"ADD URI"** (Agregar URI) o en el botón **"+"**
3. Agrega estas URLs una por una:

   ```
   http://localhost:3000/api/google-calendar/callback
   ```

   Si también vas a usar producción/staging, agrega:
   ```
   https://dev.vistral.io/api/google-calendar/callback
   ```

4. Haz clic en **"SAVE"** (Guardar) en la parte inferior de la página

### **Paso 4: Verificar**

Después de guardar, deberías ver las URLs listadas en la sección "Authorized redirect URIs"

---

## ⚠️ Notas Importantes

- Las URLs son **case-sensitive** (sensibles a mayúsculas/minúsculas)
- Deben incluir el protocolo completo (`http://` o `https://`)
- No deben terminar con una barra `/` al final
- El redirect URI debe coincidir **exactamente** con el que está en tu `.env.local`

---

## 🔍 Ubicación Visual

```
Google Cloud Console
├── APIs & Services (APIs y Servicios)
    └── Credentials (Credenciales)
        └── [Tu OAuth 2.0 Client ID]
            └── Authorized redirect URIs ← AQUÍ
```

---

## ✅ Verificación

Después de agregar las URLs y guardar, deberías poder:
1. Reiniciar tu servidor de desarrollo (`npm run dev`)
2. Iniciar sesión en la aplicación
3. Ver el componente "Google Calendar" en la página principal
4. Hacer clic en "Conectar Google Calendar" y ser redirigido a Google para autorizar

