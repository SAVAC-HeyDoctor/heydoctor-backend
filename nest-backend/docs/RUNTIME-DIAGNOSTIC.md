# Runtime Diagnostic: AuthController Not Registered

## 1. Entrypoints Found

| Location | Type | Used By |
|----------|------|---------|
| `nest-backend/src/main.ts` | NestJS bootstrap | nest-backend (correct) |
| `src/index.js` | Strapi bootstrap | Repo root (heydoctor-backend) |

**Only one Nest entrypoint:** `nest-backend/src/main.ts`

## 2. Build Output

| Source | Output |
|--------|--------|
| `src/main.ts` | `dist/main.js` |
| `src/app.module.ts` | `dist/app.module.js` |
| `src/modules/auth/auth.module.ts` | `dist/modules/auth/auth.module.js` |
| `src/modules/auth/auth.controller.ts` | `dist/modules/auth/auth.controller.js` |

**Verified:** `dist/app.module.js` imports `AuthModule`. `dist/modules/auth/auth.module.js` has `controllers: [AuthController]`.

## 3. Configuration

| Config | Value |
|--------|-------|
| nest-cli.json sourceRoot | `src` |
| tsconfig.json outDir | `./dist` |
| tsconfig.json rootDir | (implicit: project root) |
| package.json start:prod | `node dist/main.js` |
| railway.json startCommand | `node dist/main.js` |
| Dockerfile CMD | `node dist/main.js` |

## 4. File Executed in Production

**Expected:** `nest-backend/dist/main.js`

**Requires:** Railway Root Directory = `nest-backend`

If Root Directory is wrong (empty or repo root):
- Railway uses root `railway.json` (NIXPACKS)
- startCommand: `npm run start` = **strapi start**
- Runs Strapi (`src/index.js`), NOT Nest
- No AuthController (Strapi has different auth)

## 5. Inconsistencies / Mismatch

**Root cause hypothesis:** Railway Root Directory is NOT set to `nest-backend`.

| If Root = | Builder | Start | Result |
|-----------|---------|-------|--------|
| `nest-backend` | DOCKERFILE | node dist/main.js | Nest (correct) |
| `` (empty) | NIXPACKS | npm run start = strapi start | Strapi (wrong) |

**Evidence:** If you see Nest controllers (patient-reminders, analytics) but NOT AuthController, you are running Nest. So Root Directory is likely correct. The issue may be:

- **AuthModule init failure:** TypeORM/JWT/Passport fails silently during AuthModule load
- **Build cache:** Railway using cached Docker layer with old dist
- **Branch mismatch:** Deploying from branch that doesn't have latest AuthModule

## 6. Fix Required

### A. Verify Railway Settings

1. Railway Dashboard → Service → Settings
2. **Root Directory:** MUST be `nest-backend`
3. **Redeploy** (clear cache: Settings → Redeploy, or trigger new deploy)

### B. Verify Log Appears

After deploy, logs MUST show:
```
🔥 REAL ENTRYPOINT EXECUTED
```

If this does NOT appear → wrong entrypoint (likely Strapi from repo root).

### C. If Log Appears But No /api/auth

Then Nest is running but AuthModule fails to load. Check:
- `REGISTERED ROUTES:` in logs – does it list any routes?
- Database connection (AuthService needs User table)
- JWT_SECRET env var

## 7. Exact File + Line for Log

**File:** `nest-backend/src/main.ts`  
**Line:** 3 (after `import 'dotenv/config'`)  
**Content:** `console.log('🔥 REAL ENTRYPOINT EXECUTED');`
