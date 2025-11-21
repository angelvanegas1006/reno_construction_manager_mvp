# 🚀 Guía Paso a Paso: Crear Proyectos Supabase

Esta guía te llevará paso a paso para crear los 3 proyectos Supabase necesarios.

---

## 📋 Antes de Empezar

Necesitas:
- ✅ Una cuenta en Supabase (si no tienes, créala en https://app.supabase.com)
- ✅ Acceso a tu email (para verificar la cuenta)
- ⏱️ Tiempo estimado: 15-20 minutos

---

## 🎯 Proyecto 1: Development (vistral-dev)

### **Paso 1.1: Acceder a Supabase**

1. Abre tu navegador
2. Ve a: **https://app.supabase.com**
3. Inicia sesión con tu cuenta

### **Paso 1.2: Crear Nuevo Proyecto**

1. En el dashboard, busca el botón **"New Project"** (arriba a la derecha)
2. Click en **"New Project"**

### **Paso 1.3: Configurar el Proyecto**

Completa el formulario con estos valores:

**Organization:**
- Selecciona tu organización (o créala si es la primera vez)

**Project Name:**
```
vistral-dev
```

**Database Password:**
- ⚠️ **IMPORTANTE**: Genera una contraseña segura y **GUÁRDALA** en un lugar seguro
- Puedes usar el generador de Supabase o crear una tuya
- Ejemplo: `VistralDev2025!SecurePass`
- **Guarda esta contraseña** - la necesitarás más adelante

**Region:**
- Selecciona la región más cercana a tu ubicación
- Ejemplos:
  - **Europa**: `West EU (Ireland)` o `Central EU (Frankfurt)`
  - **América**: `East US (North Virginia)` o `West US (Oregon)`
  - **Asia**: `Southeast Asia (Singapore)`

**Pricing Plan:**
- Selecciona **"Free"** (suficiente para development)

### **Paso 1.4: Crear el Proyecto**

1. Click en **"Create new project"**
2. ⏳ Espera 2-3 minutos mientras Supabase crea el proyecto
3. Verás un mensaje de "Setting up your project..."

### **Paso 1.5: Obtener las Credenciales**

Una vez que el proyecto esté listo:

1. En el menú lateral izquierdo, click en **"Settings"** (icono de engranaje ⚙️)
2. Click en **"API"** (dentro de Settings)
3. **Copia estas credenciales** (las necesitarás para `.env.local`):

**Project URL:**
```
https://[tu-project-ref].supabase.co
```
Ejemplo: `https://abcdefghijklmnop.supabase.co`

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Es una cadena larga que empieza con `eyJ...`)

**service_role key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(⚠️ **SECRETO** - No lo compartas nunca)

### **Paso 1.6: Guardar las Credenciales**

Crea un archivo temporal o usa un gestor de contraseñas para guardar:

```
PROYECTO: vistral-dev
URL: https://[tu-project-ref].supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE ROLE KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE PASSWORD: [la que generaste]
```

---

## 🎯 Proyecto 2: Staging (vistral-staging)

### **Paso 2.1: Crear Nuevo Proyecto**

1. En el dashboard de Supabase, click en **"New Project"** nuevamente

### **Paso 2.2: Configurar el Proyecto**

**Project Name:**
```
vistral-staging
```

**Database Password:**
- Genera otra contraseña segura diferente
- Ejemplo: `VistralStaging2025!SecurePass`
- **Guarda esta contraseña**

**Region:**
- ⚠️ **IMPORTANTE**: Usa la **misma región** que usarás para production
- Esto asegura consistencia entre staging y production

**Pricing Plan:**
- Selecciona **"Free"** (o "Pro" si necesitas más recursos)

### **Paso 2.3: Crear y Obtener Credenciales**

1. Click en **"Create new project"**
2. Espera 2-3 minutos
3. Ve a **Settings → API**
4. **Copia las credenciales** (igual que en el paso 1.5)

### **Paso 2.4: Guardar las Credenciales**

```
PROYECTO: vistral-staging
URL: https://[tu-staging-project-ref].supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE ROLE KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE PASSWORD: [la que generaste]
```

---

## 🎯 Proyecto 3: Production (vistral-prod)

### **Opción A: Si Manu ya tiene el proyecto**

Si Manu ya creó el proyecto de producción:

1. Pídele acceso al proyecto `vistral-prod` o `fxmobdtjazijugpzkadn`
2. Ve a **Settings → API**
3. Copia las credenciales (si no las tienes ya)

### **Opción B: Si necesitas crear uno nuevo**

1. Click en **"New Project"**
2. **Project Name:** `vistral-prod`
3. **Database Password:** Genera una contraseña muy segura
4. **Region:** La más cercana a tus usuarios finales
5. **Pricing Plan:** **"Pro"** (recomendado para producción)
6. Crea el proyecto y obtén las credenciales

---

## ✅ Verificación

Una vez que tengas los 3 proyectos creados, deberías tener:

- ✅ `vistral-dev` - Development
- ✅ `vistral-staging` - Staging
- ✅ `vistral-prod` - Production (o el de Manu)

Y para cada uno, las credenciales guardadas:
- ✅ Project URL
- ✅ Anon Key
- ✅ Service Role Key
- ✅ Database Password

---

## 🎯 Siguiente Paso

Una vez que tengas los 3 proyectos creados y las credenciales guardadas, el siguiente paso será:

**Paso 2: Configurar Archivos de Entorno**

Te guiaré en el siguiente paso cuando termines este.

---

## 🆘 ¿Problemas?

### **"No puedo crear más proyectos"**
- El plan Free de Supabase tiene límites
- Solución: Actualiza a Pro o elimina proyectos antiguos que no uses

### **"No encuentro el botón New Project"**
- Asegúrate de estar en el dashboard principal
- Verifica que tienes permisos en la organización

### **"El proyecto tarda mucho en crearse"**
- Es normal, puede tardar 2-5 minutos
- No cierres la pestaña mientras se crea

---

¿Listo para empezar? Ve a https://app.supabase.com y sigue los pasos arriba. 

Cuando termines el **Proyecto 1 (vistral-dev)**, avísame y continuamos con el siguiente paso.

