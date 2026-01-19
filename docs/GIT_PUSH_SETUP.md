# Configuración de Push Automático a GitHub

## Método 1: Token de Acceso Personal (Recomendado)

### Paso 1: Crear Token en GitHub

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. Nombre: `Vistral MVP Deploy`
4. Expiración: Elige la duración (recomendado: 90 días o sin expiración)
5. Permisos: Marca **`repo`** (acceso completo a repositorios)
6. Click en **"Generate token"**
7. **Copia el token** (solo se muestra una vez)

### Paso 2: Guardar Token en Keychain (macOS)

```bash
# Guardar token en keychain (se pedirá tu contraseña de macOS)
git credential-osxkeychain store <<EOF
protocol=https
host=github.com
username=TU_USUARIO_GITHUB
password=TU_TOKEN_AQUI
EOF
```

O simplemente hacer un push y cuando pida credenciales:
- Username: tu usuario de GitHub
- Password: el token (no tu contraseña)

### Paso 3: Usar el Script Automático

```bash
# Opción A: Pasar token como argumento
./scripts/push-to-branches.sh TU_TOKEN_AQUI

# Opción B: Usar variable de entorno
export GITHUB_TOKEN=TU_TOKEN_AQUI
./scripts/push-to-branches.sh

# Opción C: Si ya está guardado en keychain, simplemente:
./scripts/push-to-branches.sh
```

## Método 2: Usar Token Directamente (Menos Seguro)

```bash
# Configurar remote con token
git remote set-url origin https://TU_TOKEN@github.com/angelvanegas1006/reno_construction_manager_mvp.git

# Hacer push normalmente
git push origin temp-main
```

## Método 3: Push Manual Simple

Si prefieres hacerlo manualmente:

```bash
# 1. Push a temp-main
git push origin temp-main

# 2. Merge a main
git checkout main
git pull origin main
git merge temp-main
git push origin main

# 3. Merge a develop
git checkout develop
git pull origin develop
git merge temp-main
git push origin develop

# 4. Volver a temp-main
git checkout temp-main
```

## Notas Importantes

- ⚠️ **Nunca subas tokens a git** - están en `.gitignore`
- 🔒 El token se guarda de forma segura en el keychain de macOS
- 🔄 Si el token expira, simplemente crea uno nuevo y guárdalo de nuevo
- 📝 El script `push-to-branches.sh` automatiza todo el proceso
