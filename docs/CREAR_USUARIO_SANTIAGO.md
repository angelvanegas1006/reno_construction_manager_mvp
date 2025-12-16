# Crear Usuario Santiago Figueiredo para Settlements

## Credenciales
- **Email:** `santiago.figueiredo@prophero.com`
- **Password:** `santi123*`

## Método Recomendado: Desde Supabase Dashboard

1. Ve a tu proyecto Supabase:
   ```
   https://app.supabase.com/project/kqqobbxjyrdputngvxrf
   ```

2. Menú lateral → **Authentication** → **Users**

3. Click en **"Add user"** → **"Create new user"**

4. Completa el formulario:
   ```
   Email: santiago.figueiredo@prophero.com
   Password: santi123*
   Auto Confirm User: ✅ (Marca esta casilla)
   ```

5. Click **"Create user"**

6. **¡Listo!** Ahora puedes hacer login con:
   - Email: `santiago.figueiredo@prophero.com`
   - Password: `santi123*`

## Comportamiento del Login

Cuando Santiago inicia sesión:
1. El sistema detecta su email (`santiago.figueiredo@prophero.com`)
2. Automáticamente establece `localStorage.setItem("userRole", "settlements_analyst")`
3. Redirige a `/settlements/kanban`
4. Las tarjetas de prueba se crean automáticamente la primera vez

## Enlace Local

```
http://localhost:3000/settlements/kanban
```

## Notas

- El rol `settlements_analyst` no está en el enum de Supabase, por lo que se maneja temporalmente con localStorage
- El usuario puede iniciar sesión normalmente con email/password
- El sistema automáticamente detecta el email y establece el rol correcto

