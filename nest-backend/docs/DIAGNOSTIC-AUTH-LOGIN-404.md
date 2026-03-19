# Diagnóstico: POST /api/auth/login 404 en producción

## Verificaciones realizadas

### 1. Bootstrap
- **Entrypoint**: `src/main.ts` (único main.ts en el proyecto)
- **Módulo**: `AppModule` (main.ts línea 7: `NestFactory.create(AppModule)`)
- **Prefijo global**: `app.setGlobalPrefix('api')` ✓

### 2. AppModule
- **AppController** está en `controllers: [AppController]` ✓

### 3. AppController
- `@Controller()` ✓
- `@Post('auth/login')` ✓
- `@Public()` ✓
- AuthService inyectado ✓

### 4. Build
- `dist/app.controller.js` contiene `auth/login` ✓
- `dist/main.js` usa `AppModule` ✓

### 5. Railway
- **railway.json**: `startCommand: "node dist/main.js"` ✓
- **Dockerfile**: `CMD ["node", "dist/main.js"]` ✓
- **Root directory**: `/nest-backend` (debe coincidir con la carpeta del repo)

---

## Causa raíz más probable

Si los logs **NO** muestran `AppController loaded` ni `Mapped {/api/auth/login, POST}`:

**La app crashea durante la inicialización de módulos**, antes de que Nest instancie los controllers. Esto ocurre cuando:

1. **TypeORM** no puede conectar a la base de datos (DATABASE_URL, DATABASE_PRIVATE_URL)
2. Algún **módulo importado** lanza durante su `onModuleInit`
3. **Variables de entorno** faltantes en Railway

---

## Fix aplicado

1. **Endpoint `/api/ping`** – Si responde, AppController está cargado
2. **Logs de bootstrap** – Para localizar dónde falla:
   - `[BOOTSTRAP] Starting NestJS bootstrap...` → inicio
   - `[BOOTSTRAP] AppModule created...` → AppModule cargado
   - `AppController loaded` → controller instanciado
   - `[BOOTSTRAP] Application is running...` → app lista
3. **Logger debug** – Para ver `Mapped {/api/..., METHOD}`

---

## Qué hacer tras deploy

1. **Si ves `[BOOTSTRAP] Starting...` pero NO `AppModule created`**  
   → Crash en `NestFactory.create(AppModule)`. Revisar: TypeORM, ConfigModule, variables de entorno.

2. **Si ves `AppModule created` pero NO `AppController loaded`**  
   → Crash al instanciar AppController (AuthService). Revisar: AuthModule, conexión DB.

3. **Si ves `AppController loaded` y `Application is running`**  
   → Probar `curl https://tu-url/api/ping` y `curl -X POST https://tu-url/api/auth/login -d '{}'`

4. **Si NO ves ningún log `[BOOTSTRAP]`**  
   → Railway está ejecutando otro build/código. Verificar: Root directory, branch, último deploy.
