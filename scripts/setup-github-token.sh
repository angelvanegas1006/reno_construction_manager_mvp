#!/bin/bash

# Script para configurar token de GitHub de forma segura

echo "🔐 Configuración de Token de GitHub"
echo ""
echo "Para crear un token:"
echo "1. Ve a: https://github.com/settings/tokens"
echo "2. Click en 'Generate new token' → 'Generate new token (classic)'"
echo "3. Nombre: 'Vistral MVP Deploy'"
echo "4. Marca el scope 'repo'"
echo "5. Copia el token generado"
echo ""
read -p "Pega tu token aquí: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Token vacío. Abortando."
  exit 1
fi

# Guardar en keychain
echo "username=angelvanegas1006" | git credential-osxkeychain store
echo "password=$TOKEN" | git credential-osxkeychain store
echo "protocol=https" | git credential-osxkeychain store
echo "host=github.com" | git credential-osxkeychain store

echo ""
echo "✅ Token guardado en keychain de macOS"
echo ""
echo "Ahora puedes usar:"
echo "  ./scripts/push-to-branches.sh"
echo ""
echo "O hacer push manualmente:"
echo "  git push origin temp-main"
