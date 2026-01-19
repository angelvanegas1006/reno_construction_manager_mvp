#!/bin/bash

# Script para hacer push automático a main y develop
# Uso: ./scripts/push-to-branches.sh [token]

set -e

TOKEN="${1:-${GITHUB_TOKEN}}"
REPO="angelvanegas1006/reno_construction_manager_mvp"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Se requiere un token de GitHub"
  echo ""
  echo "Uso:"
  echo "  $0 <token>"
  echo "  o"
  echo "  export GITHUB_TOKEN=<token> && $0"
  echo ""
  echo "Para crear un token:"
  echo "  1. Ve a https://github.com/settings/tokens"
  echo "  2. Generate new token (classic)"
  echo "  3. Marca 'repo' scope"
  echo "  4. Copia el token"
  exit 1
fi

# Configurar remote con token
git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"

echo "📤 Pusheando temp-main..."
git push origin temp-main

echo "🔄 Haciendo merge a main..."
git checkout -b main-merge 2>/dev/null || git checkout main-merge
git fetch origin main
git reset --hard origin/main
git merge temp-main --no-edit -m "Merge temp-main: $(git log -1 --pretty=%B temp-main)"
git push origin main-merge:main
git checkout temp-main
git branch -D main-merge

echo "🔄 Haciendo merge a develop..."
git checkout -b develop-merge 2>/dev/null || git checkout develop-merge
git fetch origin develop
git reset --hard origin/develop
git merge temp-main --no-edit -m "Merge temp-main: $(git log -1 --pretty=%B temp-main)"
git push origin develop-merge:develop
git checkout temp-main
git branch -D develop-merge

echo "✅ Push completado a main y develop!"
