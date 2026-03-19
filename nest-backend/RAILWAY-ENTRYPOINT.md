# Railway Entrypoint Configuration

## Required Settings

**Root Directory:** MUST be `nest-backend` (or `/nest-backend`)

If Root Directory is wrong, Railway will use the repo root's config:
- Root `railway.json` uses NIXPACKS + `npm run start` → runs **Strapi** (wrong app)
- Root `package.json` has `"start": "strapi start"` → wrong entrypoint

## Correct Configuration

| Setting | Value |
|---------|-------|
| Root Directory | `nest-backend` |
| Builder | DOCKERFILE (from nest-backend/railway.json) |
| Start Command | `node dist/main.js` |
| Entrypoint | nest-backend/src/main.ts → dist/main.js |

## Verification

On deploy, logs MUST show:
```
🔥 CORRECT MAIN EXECUTED
```

If this log does NOT appear, the wrong entrypoint is running (likely Strapi from repo root).
