# 🔄 Cambiar a Producción en Localhost

## ✅ Configuración Completada

He actualizado tu `.env.local` para usar el proyecto de **producción** (de Manu) en localhost.

---

## 📋 Estado Actual

Tu `.env.local` ahora apunta a:
- **Proyecto**: Producción (fxmobdtjazijugpzkadn.supabase.co)
- **Usuarios**: Los mismos que en producción
- **Datos**: Los mismos que en producción

---

## ⚠️ Falta: Service Role Key

Necesitas agregar el `SUPABASE_SERVICE_ROLE_KEY` de producción:

1. Ve a: https://app.supabase.com/project/fxmobdtjazijugpzkadn
2. Settings → API
3. Copia el **service_role secret** key
4. Edita `.env.local` y reemplaza:
   ```
   SUPABASE_SERVICE_ROLE_KEY=REEMPLAZAR_CON_SERVICE_ROLE_KEY_DE_PRODUCCION
   ```
   Con:
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
   ```

---

## 🚀 Reiniciar Servidor

Después de agregar el service_role key:

```bash
# Detén el servidor actual (Ctrl+C)
npm run dev
```

---

## ✅ Probar Login

Ahora puedes hacer login con usuarios de producción:
- Email: `manuel.gomez@prophero.com`
- Password: [la contraseña de Manu]

---

## 🔄 Volver a Desarrollo

Cuando termines de probar, restaura la configuración de desarrollo:

```bash
cp .env.local.dev.backup .env.local
npm run dev
```

---

## 📝 Notas

- ⚠️ **No commitees** `.env.local` con credenciales de producción
- ✅ Se creó un backup: `.env.local.dev.backup`
- 🔒 Las credenciales de producción son sensibles

---

¿Tienes el service_role key de producción o necesitas pedírselo a Manu?

