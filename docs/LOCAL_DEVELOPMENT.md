# Guía de Desarrollo Local

## 🛑 Detener Instancias en Ejecución

### Método 1: Buscar y matar procesos por puerto

```bash
# Ver qué proceso está usando el puerto 3000 (puerto por defecto de Next.js)
lsof -ti:3000

# Matar el proceso en el puerto 3000
kill -9 $(lsof -ti:3000)

# O en una sola línea:
lsof -ti:3000 | xargs kill -9
```

### Método 2: Buscar procesos de Node/Next.js

```bash
# Ver todos los procesos de Node.js
ps aux | grep node

# Matar procesos específicos de Next.js
pkill -f "next dev"
pkill -f "npm run dev"
```

### Método 3: Si estás en la terminal donde corre el proceso

Simplemente presiona `Ctrl + C` para detener el proceso.

### Método 4: Matar todos los procesos de Node (⚠️ Cuidado)

```bash
# Esto matará TODOS los procesos de Node.js
killall node
```

## 🚀 Iniciar Servidor de Desarrollo

### Desarrollo Normal

```bash
cd vistral-mvp
npm run dev
```

Esto iniciará el servidor en `http://localhost:3000`

### Desarrollo con puerto específico

```bash
PORT=3001 npm run dev
```

### Ver logs detallados

```bash
DEBUG=* npm run dev
```

## 🔍 Verificar qué está corriendo

### Ver procesos en puertos comunes

```bash
# Puerto 3000 (Next.js)
lsof -i:3000

# Puerto 3001 (alternativo)
lsof -i:3001

# Ver todos los puertos en uso
lsof -i -P -n | grep LISTEN
```

### Ver procesos de Node.js

```bash
ps aux | grep node
```

## 🧹 Limpiar antes de iniciar

### Limpiar caché de Next.js

```bash
rm -rf .next
npm run dev
```

### Limpiar node_modules y reinstalar

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📝 Scripts Útiles

Puedes agregar estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:clean": "rm -rf .next && next dev",
    "kill:port": "lsof -ti:3000 | xargs kill -9",
    "dev:force": "npm run kill:port && npm run dev"
  }
}
```

Luego puedes usar:
- `npm run dev:clean` - Limpia caché y inicia
- `npm run kill:port` - Mata procesos en puerto 3000
- `npm run dev:force` - Mata procesos y reinicia

## ⚠️ Problemas Comunes

### Puerto ya en uso

```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# Opción 1: Matar el proceso
kill -9 $(lsof -ti:3000)

# Opción 2: Usar otro puerto
PORT=3001 npm run dev
```

### Proceso zombie que no se detiene

```bash
# Encontrar el PID
ps aux | grep "next dev"

# Matar por PID específico
kill -9 <PID>
```

### Múltiples instancias corriendo

```bash
# Ver todas las instancias
ps aux | grep "next dev"

# Matar todas
pkill -f "next dev"
```

## 🔄 Flujo Recomendado

1. **Detener cualquier proceso existente:**
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null || true
   ```

2. **Limpiar caché (opcional):**
   ```bash
   rm -rf .next
   ```

3. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

4. **Si necesitas detener:**
   - Presiona `Ctrl + C` en la terminal
   - O ejecuta: `lsof -ti:3000 | xargs kill -9`

## 🐳 Si usas Docker

```bash
# Detener contenedores
docker-compose down

# Detener y remover volúmenes
docker-compose down -v

# Ver contenedores corriendo
docker ps
```


