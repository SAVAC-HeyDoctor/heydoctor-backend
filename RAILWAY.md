# Deploy en Railway – jairosc23/heydoctor-backend

Este repo **es solo el backend**. El código está en la **raíz** (server.js, package.json aquí).

## Configuración en Railway

### 1. Conectar el repositorio

- **Repositorio:** https://github.com/jairosc23/heydoctor-backend
- **Root Directory:** déjalo **vacío** (o `/`). No pongas `backend` — en este repo la raíz ya es el backend.

### 2. Start command

Railway usará por defecto `node server.js` (Procfile / package.json). No hace falta configurar nada más.

### 3. Variables de entorno (crear en Railway → Variables)

| Variable | Obligatoria | Ejemplo / Nota |
|----------|-------------|----------------|
| `DATABASE_URL` | Sí | `postgresql://postgres:xxx@yamabiko.proxy.rlwy.net:39570/railway` (Railway Postgres) |
| `JWT_SECRET` | Sí | Mínimo 32 caracteres (ej: `openssl rand -base64 32`) |
| `ADMIN_EMAIL` | Sí | `admin@heydoctor.health` |
| `ADMIN_PASSWORD` | Sí | `123456` (o la que uses) |
| `ADMIN_NAME` | Sí | `Administrador` |
| `ONESIGNAL_APP_ID` | Si usas push | Tu App ID de OneSignal |
| `ONESIGNAL_REST_API_KEY` | Si usas push | Tu Rest API Key de OneSignal |
| `NODE_ENV` | Recomendada | `production` |

**No crear:** `PORT` (Railway la asigna).

### 4. PostgreSQL en Railway

Si usas el plugin PostgreSQL de Railway, añade la variable por referencia: **Variables** → **Add variable** → **Add reference** → elige el servicio **PostgreSQL** → selecciona **`DATABASE_URL`** (o `DATABASE_PRIVATE_URL`).

**Si ves "Invalid URL" en los logs:** `DATABASE_URL` no está definida o está vacía. Asegúrate de que el servicio backend tenga la variable vinculada al PostgreSQL de Railway.

### 5. Después del deploy

- La tabla `users` se crea sola al arrancar (CREATE TABLE IF NOT EXISTS).
- El usuario admin se crea con `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` si no existe.

**Probar login:**

```bash
curl -X POST https://TU-URL-RAILWAY/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@heydoctor.health","password":"123456"}'
```

Debe devolver JSON: `{ "token": "...", "user": { "id", "email", "name" } }`.

**En Vercel (frontend):** pon `VITE_API_URL=https://TU-URL-RAILWAY` (sin barra final) y redeploy.

### 6. Probar desde código (fetch)

```js
const res = await fetch("https://TU-URL-RAILWAY/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@heydoctor.health", password: "123456" }),
});
const data = await res.json();
// Éxito: data = { token: "...", user: { id, email, name } }
// Error: data = { error: "..." }
```

La respuesta siempre debe ser JSON (nunca HTML). Si ves HTML o 404, revisa Root Directory (debe estar vacío).
