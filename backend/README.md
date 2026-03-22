# Backend Express (HeyDoctor)

Si ves `GET /pacientes` → `Not Found`, casi siempre **falta** en `server.js`:

```js
const pacientesRoutes = require('./routes/pacientes');
app.use('/pacientes', pacientesRoutes);
```

## Arranque

```bash
cd backend
npm install
node server.js
```

Por defecto: **http://localhost:8080/pacientes**

## Si tu `server.js` está en otro directorio

Copia solo el `require` y el `app.use` de arriba, en el mismo orden relativo que el resto de rutas (antes del middleware 404).
