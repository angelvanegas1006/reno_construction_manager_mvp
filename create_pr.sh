#!/bin/bash

# Script para crear Pull Request a upstream/dev usando GitHub API
# Requiere: GITHUB_TOKEN en variables de entorno o como argumento

REPO_OWNER="angelvanegas1006"
REPO_NAME="reno_construction_manager_mvp"
BASE_BRANCH="dev"
HEAD_BRANCH="manuelPH:develop"
TITLE="feat: Mejoras y Nuevas Funcionalidades - Sistema de ayuda, filtros avanzados, Google Maps, mejoras UI/UX"

# Leer descripción del PR
BODY=$(cat PR_DESCRIPTION.md)

# Si se pasa token como argumento
if [ ! -z "$1" ]; then
  GITHUB_TOKEN="$1"
fi

# Verificar que existe el token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: Se requiere GITHUB_TOKEN"
  echo "Uso: ./create_pr.sh [GITHUB_TOKEN]"
  echo "O exporta: export GITHUB_TOKEN=tu_token"
  exit 1
fi

# Crear el PR usando GitHub API
echo "🚀 Creando Pull Request..."
echo "Base: $BASE_BRANCH"
echo "Head: $HEAD_BRANCH"
echo ""

RESPONSE=$(curl -s -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls" \
  -d "{
    \"title\": \"$TITLE\",
    \"body\": $(echo "$BODY" | jq -Rs .),
    \"head\": \"$HEAD_BRANCH\",
    \"base\": \"$BASE_BRANCH\"
  }")

# Verificar respuesta
if echo "$RESPONSE" | grep -q '"number"'; then
  PR_NUMBER=$(echo "$RESPONSE" | grep -o '"number":[0-9]*' | grep -o '[0-9]*')
  PR_URL=$(echo "$RESPONSE" | grep -o '"html_url":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Pull Request creado exitosamente!"
  echo "📝 Número: #$PR_NUMBER"
  echo "🔗 URL: $PR_URL"
else
  echo "❌ Error al crear Pull Request:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

