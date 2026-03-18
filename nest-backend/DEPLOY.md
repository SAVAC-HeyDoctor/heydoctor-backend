# Deploy HeyDoctor Backend

## Railway

1. Conectar el repo `heydoctor-backend` a Railway
2. **Root Directory**: En Settings → Build, configurar `nest-backend` como root
3. Añadir PostgreSQL (Railway inyecta `DATABASE_URL`)
4. Variables de entorno:
   - `JWT_SECRET` (obligatorio)
   - `OPENAI_API_KEY` (opcional, para AI)
5. Deploy automático con Dockerfile

## Repo GitHub

- **heydoctor-backend**: https://github.com/SAVAC-HeyDoctor/heydoctor-backend
- El backend NestJS está en la carpeta `nest-backend/`

## Verificación

- Health: `GET /api/health`
- Con JWT: `GET /api/clinics/me`
