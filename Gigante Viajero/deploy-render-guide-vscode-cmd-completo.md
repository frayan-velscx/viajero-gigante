# Deploy completo del proyecto en Render (Visual Studio Code CMD)

## Tabla de Contenidos
1. [Requisitos previos](#1-requisitos-previos)
2. [Crear repositorio en GitHub](#2-crear-repositorio-en-github)
3. [Conectar proyecto local con GitHub usando CMD](#3-conectar-proyecto-local-con-github-usando-cmd)
4. [Subir actualizaciones al repositorio](#4-subir-actualizaciones-al-repositorio)
5. [Crear cuenta en Render](#5-crear-cuenta-en-render)
6. [Crear servicio backend en Render](#6-crear-servicio-backend-en-render)
7. [Configurar variables de entorno en Render](#7-configurar-variables-de-entorno-en-render)
8. [Configurar Resend para envío de correos](#8-configurar-resend-para-envío-de-correos)
9. [Configurar MongoDB Atlas para Render](#9-configurar-mongodb-atlas-para-render)
10. [Desplegar el frontend](#10-desplegar-el-frontend)
11. [Realizar el deploy](#11-realizar-el-deploy)
12. [Configurar login con Google (Firebase)](#12-configurar-login-con-google-firebase)
13. [Verificar funcionamiento](#13-verificar-funcionamiento)
14. [Actualizar la aplicación](#14-actualizar-la-aplicación)
15. [Errores comunes en Linux/Render](#15-errores-comunes-en-linuxrender)
16. [Checklist final de deploy](#16-checklist-final-de-deploy)

---

## 1. Requisitos previos

- Node.js instalado ([descargar aquí](https://nodejs.org/))
- Cuenta en GitHub ([crear aquí](https://github.com/join))
- Cuenta en MongoDB Atlas ([crear aquí](https://www.mongodb.com/cloud/atlas/register))
- Cuenta en Render ([crear aquí](https://render.com/register))
- Cuenta en Resend ([crear aquí](https://resend.com/signup))

---

## 2. Crear repositorio en GitHub

1. Ingresa a [github.com](https://github.com)
2. Haz clic en "New repository"
3. Escribe el nombre del repositorio
4. Elige visibilidad
5. No crees README inicial
6. Haz clic en "Create repository"

---

## 3. Conectar proyecto local con GitHub usando CMD

Abre la terminal CMD de Visual Studio Code en la raíz del proyecto y ejecuta:

```
git init
git add .
git commit -m "primer commit"
git branch -M main
git remote add origin URL_REPOSITORIO
git push -u origin main
```

> Reemplaza `URL_REPOSITORIO` por la URL de tu repo.

---

## 4. Subir actualizaciones al repositorio

```
git add .
git commit -m "mensaje del cambio"
git push
```

> Render detecta cada `git push` y redespliega automáticamente.

---

## 5. Crear cuenta en Render

1. Ingresa a [render.com](https://render.com)
2. Regístrate con GitHub
3. Autoriza repositorios

---

## 6. Crear servicio backend en Render

1. Haz clic en "New Web Service"
2. Selecciona el repositorio
3. Completa los campos así:

| Campo | Valor |
|---|---|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `node src/server.js` |

4. Elige región
5. Haz clic en "Create Web Service"

---

## 7. Configurar variables de entorno en Render

En el servicio backend ve a **Environment** y agrega:

| Variable | Descripción |
|---|---|
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | URI de conexión de MongoDB Atlas |
| `JWT_SECRET` | Clave secreta para tokens JWT |
| `JWT_EXPIRE` | Tiempo de expiración (ej. `30d`) |
| `JWT_COOKIE_EXPIRE` | Días de expiración de cookie (ej. `30`) |
| `BCRYPT_ROUNDS` | Rondas de encriptación (ej. `12`) |
| `OPENAI_API_KEY` | API Key de OpenAI |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret de Stripe |
| `FRONTEND_URL` | URL pública del Static Site (se actualiza en el paso 11) |
| `ALLOWED_ORIGINS` | Misma URL del frontend |
| `RESEND_API_KEY` | API Key de Resend (ver paso 8) |
| `EMAIL_FROM` | `onboarding@resend.dev` (sin dominio propio) |

---

## 8. Configurar Resend para envío de correos

Resend es el servicio de correo del proyecto. Plan gratuito: 3,000 emails/mes.

### Crear cuenta y obtener API Key

1. Ingresa a [resend.com](https://resend.com) y crea una cuenta
2. En el dashboard ve a **API Keys**
3. Haz clic en **Create API Key**
4. Copia la clave generada (empieza con `re_...`)

### Configurar en el proyecto

En tu archivo `.env` local:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
```

En Render → backend → **Environment**, agrega las mismas dos variables.

> **Nota:** Con el plan gratuito sin dominio verificado, solo puedes enviar desde `onboarding@resend.dev` y los correos solo llegan a tu propio email registrado en Resend. Para enviar a cualquier destinatario necesitas verificar un dominio propio en Resend.

> **Importante:** Nunca hagas `git push` del archivo `.env` — debe estar en el `.gitignore`.

---

## 9. Configurar MongoDB Atlas para Render

Render usa IPs dinámicas, por lo que debes permitir acceso desde cualquier IP en Atlas:

1. Ingresa a [cloud.mongodb.com](https://cloud.mongodb.com)
2. Selecciona tu cluster
3. Ve a **Network Access** en el menú izquierdo
4. Haz clic en **Add IP Address**
5. Selecciona **Allow Access from Anywhere** (`0.0.0.0/0`)
6. Haz clic en **Confirm**

> Sin este paso el backend no podrá conectarse a la base de datos y verás el error `Could not connect to any servers in your MongoDB Atlas cluster`.

---

## 10. Desplegar el frontend

1. Haz clic en "New Static Site"
2. Selecciona el repositorio
3. Completa los campos así:

| Campo | Valor |
|---|---|
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | *(dejar vacío)* |
| **Publish Directory** | `pages` |

> El frontend es HTML/CSS/JS puro — no tiene proceso de build.
> `pages` indica que el `index.html` principal está dentro de `frontend/pages/`.

4. **Environment Variables**: dejar vacío — el frontend no usa variables de entorno del servidor.
5. Haz clic en **Deploy static site**

### Si el frontend no carga después del deploy

Verifica el Publish Directory:
1. Ve al Static Site en Render → **Settings**
2. Busca **Build & Deploy**
3. Confirma que **Publish Directory** sea `pages`
4. Guarda y espera el redeploy

---

## 11. Realizar el deploy

- Render ejecuta el build automáticamente tras cada push
- Revisa los logs en el dashboard
- Obtén la URL pública del frontend (ej. `https://gigante-viajero-1.onrender.com`)

### Conectar frontend con backend (CORS)

Una vez obtenida la URL del frontend, actualiza el backend:

1. Ve al servicio backend en Render → **Environment**
2. Actualiza `FRONTEND_URL` con la URL del Static Site
3. Actualiza `ALLOWED_ORIGINS` con la misma URL
4. Haz clic en **Save Changes** — Render redesplegará el backend automáticamente

---

## 12. Configurar login con Google (Firebase)

El botón de Google usa Firebase Authentication. Para que funcione en producción debes autorizar los dominios de Render en Firebase Console.

### Paso 1 — Autorizar dominios en Firebase

1. Ingresa a [console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Configuración** → **Dominios autorizados**
4. Haz clic en **Agregar dominio** y agrega los dos dominios de Render (sin `https://`):
   - Dominio del **frontend** (Static Site) — ej. `gigante-viajero-1.onrender.com`
   - Dominio del **backend** (Web Service) — ej. `gigante-viajero.onrender.com`

> Sin este paso Firebase bloquea el popup de Google y el login falla en producción.

### Paso 2 — URL dinámica del backend en el frontend

El archivo `frontend/scripts/auth-api.js` debe detectar automáticamente si está en local o en producción:

```js
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://tu-backend.onrender.com';
```

> Reemplaza `tu-backend.onrender.com` con la URL real de tu Web Service en Render.

---

## 13. Verificar funcionamiento

- Accede a la URL del frontend y navega por el sitio
- Prueba login, registro y el botón de Google
- Verifica la conexión a MongoDB en los logs del backend
- Comprueba que los correos lleguen correctamente

---

## 14. Actualizar la aplicación

```
git add .
git commit -m "descripción del cambio"
git push
```

Render redespliega automáticamente al detectar el nuevo commit en GitHub.

> Si cambias variables de entorno, actualízalas directamente en Render — no es necesario hacer push.

---

## 15. Errores comunes en Linux/Render

### Error: `Cannot find module '../controllers/MiControlador'`

**Causa:** Linux distingue mayúsculas y minúsculas en nombres de archivo. Windows no, por lo que el error solo aparece al desplegar en Render.

**Solución:** El nombre en el `require()` debe coincidir **exactamente** con el nombre del archivo en disco, incluyendo mayúsculas.

```js
// ❌ Incorrecto (falla en Linux)
require('../controllers/Sitiocontroller')

// ✅ Correcto (nombre exacto del archivo)
require('../controllers/sitiocontroller')
```

**Cómo prevenirlo:** Al crear nuevos archivos, usa nombres consistentes (preferiblemente todo en minúsculas) y verifica que los `require()` usen el mismo nombre exacto.

---

### Error: `Could not connect to any servers in your MongoDB Atlas cluster`

**Causa:** La IP de Render no está autorizada en MongoDB Atlas.

**Solución:** Permitir acceso desde cualquier IP (ver [paso 9](#9-configurar-mongodb-atlas-para-render)).

---

### Error: `Faltan credenciales RESEND_API_KEY`

**Causa:** La variable de entorno no está configurada en Render.

**Solución:** Agregar `RESEND_API_KEY` y `EMAIL_FROM` en Render → backend → **Environment**.

---

### Error: `Bad sender address syntax` al enviar correo

**Causa:** El campo `from` del correo usa una variable de entorno incorrecta o inexistente (ej. `EMAIL_USER` en lugar de `EMAIL_FROM`), lo que produce una dirección vacía o inválida.

**Solución:** Verificar que todos los campos `from` en los archivos de email usen `process.env.EMAIL_FROM` y no tengan emojis en el nombre del remitente.

```js
// ❌ Incorrecto
from: `"Gigante Viagero 🌎" <${process.env.MAIL_USER}>`

// ✅ Correcto
from: `"Gigante Viagero" <${process.env.EMAIL_FROM}>`
```

---

### Error: Credenciales inválidas después de resetear contraseña

**Causa:** Si el usuario creó su cuenta con Google (`authProvider: 'google'`), el sistema bloqueaba el login con contraseña aunque se hubiera reseteado correctamente.

**Solución:** Al resetear la contraseña, también actualizar `authProvider` a `'local'` en la base de datos:

```js
await User.findOneAndUpdate(
    { email },
    { $set: { password: hashedPassword, authProvider: 'local' } }
);
```

---

## 16. Checklist final de deploy

- [ ] Node.js instalado
- [ ] Cuenta en GitHub, MongoDB Atlas, Render y Resend
- [ ] Repo creado en GitHub y proyecto subido
- [ ] `.env` excluido del repositorio (en `.gitignore`)
- [ ] IP `0.0.0.0/0` autorizada en MongoDB Atlas
- [ ] Servicio backend creado en Render
- [ ] Variables de entorno configuradas en Render (incluyendo `RESEND_API_KEY`)
- [ ] Static Site frontend creado con **Publish Directory** = `pages`
- [ ] `FRONTEND_URL` y `ALLOWED_ORIGINS` actualizadas con la URL del frontend
- [ ] Dominios de Render autorizados en Firebase Console
- [ ] URL dinámica del backend configurada en `auth-api.js`
- [ ] Login con Google funcionando en producción
- [ ] Deploy realizado y verificado
- [ ] Correos de prueba funcionando

---

> Todos los pasos están adaptados para terminal CMD de Visual Studio Code.
