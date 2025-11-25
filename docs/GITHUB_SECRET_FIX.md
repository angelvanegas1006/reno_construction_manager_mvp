# 🔐 Solución: GitHub Bloquea Push por Secret Detection

## ⚠️ Problema

GitHub detectó el token de Airtable en commits anteriores y está bloqueando el push.

## ✅ Solución Rápida

### Opción 1: Permitir el Secret (Recomendado para este caso)

1. Ve a este link: https://github.com/angelvanegas1006/reno_construction_manager_mvp/security/secret-scanning/unblock-secret/35uuSugpC1iY9oFkuEy4xAz9DfP

2. Click en **"Allow secret"** o **"Unblock"**

3. Esto permitirá el push una vez (ya removimos el secret de los archivos actuales)

4. Intenta el push de nuevo:
   ```bash
   git push origin main
   ```

### Opción 2: Remover del Historial (Más Complejo)

Si prefieres remover completamente el secret del historial:

```bash
# Usar git filter-branch o BFG Repo-Cleaner
# ⚠️ ADVERTENCIA: Esto reescribe el historial de Git
# Solo hazlo si estás seguro y nadie más tiene esos commits
```

## 📝 Nota

Ya removimos el token de todos los archivos de documentación actuales. El problema es que está en commits anteriores. La opción 1 es la más segura y rápida.

## 🔒 Prevención Futura

Para evitar esto en el futuro:

1. **Nunca commitees credenciales** en archivos de documentación
2. Usa placeholders como `patXXXXXXXXXXXXXX`
3. Las credenciales reales solo van en:
   - `.env.local` (gitignored)
   - Variables de entorno en Vercel
   - Nunca en archivos commitados


